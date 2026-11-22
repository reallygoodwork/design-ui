import * as z from "zod";
import type { Annotation } from "./annotations";
import type { ChangeEntry } from "./changeLog";
import { type Rule, rulesSchema } from "./rules";
import type { Token, TokenDimensions } from "./tokens";
import type { Breakpoint, CSSVars, Layer } from "./types";

/** The newest document version this package reads and writes. */
export const DOCUMENT_VERSION = 1;

const cssVars = z
	.record(z.string(), z.string())
	.describe('CSS custom properties, like { "--font-size": "16px" }');

const actor = z.object({
	kind: z.enum(["user", "agent"]),
	name: z.string(),
});

export const layerSchema: z.ZodType<Layer> = z
	.object({
		id: z.string().min(1),
		name: z.string(),
		type: z.string().min(1).describe("A registered layer type, like text"),
		value: z.string().describe("Text content, or an image's URL"),
		cssVars: cssVars
			.optional()
			.describe("Base styles, at the smallest breakpoint"),
		breakpointCssVars: z
			.record(z.string(), cssVars)
			.optional()
			.describe("Only the styles each larger breakpoint overrides"),
		meta: z.record(z.string(), z.unknown()).optional(),
		isLocked: z.boolean().optional(),
		elementType: z.string().optional().describe("The HTML element, like h1"),
		get children() {
			return z.array(layerSchema).optional();
		},
	})
	.meta({
		id: "Layer",
		description: "A layer: a box, text or image, with its styles",
	});

export const breakpointSchema: z.ZodType<Breakpoint> = z.object({
	id: z.string().min(1),
	name: z.string(),
	width: z.number().positive(),
	height: z.number().positive(),
	position: z.object({ x: z.number(), y: z.number() }),
});

export const tokenSchema: z.ZodType<Token> = z.object({
	path: z
		.string()
		.regex(/^[a-z0-9][\w-]*(\.[\w-]+)*$/i, "Use a path like color.bg.page"),
	type: z.enum([
		"color",
		"dimension",
		"fontFamily",
		"fontWeight",
		"number",
		"shadow",
	]),
	tier: z.enum(["primitive", "semantic", "component"]),
	value: z.string(),
	modes: z
		.array(
			z.object({ when: z.record(z.string(), z.string()), value: z.string() })
		)
		.optional(),
	description: z.string().optional(),
});

const annotationTarget = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("layer"),
		layerId: z.string(),
		property: z.string().optional(),
		breakpointId: z.string().optional(),
	}),
	z.object({ kind: z.literal("token"), path: z.string() }),
	z.object({
		kind: z.literal("change"),
		entryId: z.string(),
		layerId: z.string().optional(),
	}),
	z.object({ kind: z.literal("document") }),
]);

export const annotationSchema: z.ZodType<Annotation> = z.object({
	id: z.string(),
	kind: z.enum(["comment", "note", "decision", "task"]),
	target: annotationTarget,
	body: z.string(),
	author: actor,
	at: z.string(),
	status: z.enum(["open", "resolved"]),
	replies: z.array(
		z.object({
			id: z.string(),
			author: actor,
			body: z.string(),
			at: z.string(),
		})
	),
	entryId: z.string().optional(),
	assignedTo: actor.optional(),
	claimedBy: actor.optional(),
});

export const changeEntrySchema: z.ZodType<ChangeEntry> = z.object({
	id: z.string(),
	at: z.string(),
	actor,
	reason: z.string().optional(),
	taskId: z.string().optional(),
	kind: z.enum(["layer", "frame", "breakpoint", "document", "tokens"]),
	summary: z.string(),
	layerIds: z.array(z.string()),
	changes: z.array(
		z.object({
			layerId: z.string().optional(),
			property: z.string(),
			breakpointId: z.string().nullable().optional(),
			from: z.string().optional(),
			to: z.string().optional(),
		})
	),
	tokens: z
		.object({ before: z.array(tokenSchema), after: z.array(tokenSchema) })
		.optional(),
	undone: z.boolean().optional(),
	undoable: z.boolean().default(true),
	coalesceKey: z.string().nullable().optional(),
});

export const documentSchema = z
	.object({
		version: z.literal(DOCUMENT_VERSION),
		exportedAt: z.string().optional(),
		layers: z.array(layerSchema),
		breakpoints: z.array(breakpointSchema).min(1),
		frameStyles: cssVars.default({}),
		tokens: z.array(tokenSchema).default([]),
		tokenDimensions: z
			.record(z.string(), z.array(z.string()).min(1))
			.default({})
			.describe('Modes tokens vary by, like { theme: ["light", "dark"] }'),
		rules: rulesSchema.default([]),
		annotations: z.array(annotationSchema).default([]),
		changes: z.array(changeEntrySchema).default([]),
	})
	.describe("A design: its layers, breakpoints, tokens and editing rules");

export type DesignDocument = {
	version: typeof DOCUMENT_VERSION;
	exportedAt?: string;
	layers: Layer[];
	breakpoints: Breakpoint[];
	frameStyles: CSSVars;
	tokens: readonly Token[];
	tokenDimensions: TokenDimensions;
	rules: Rule[];
	annotations: Annotation[];
	changes: ChangeEntry[];
};

/** Something wrong with a document, and where: `layers.0.children.2.type`. */
export type DocumentProblem = { path: string; message: string };

export type LoadResult =
	| { ok: true; document: DesignDocument }
	| { ok: false; problems: DocumentProblem[] };

/**
 * Upgrades from each older version to the next. Empty while there is only
 * version 1; a version 2 adds `1: (doc) => ({ ...doc, version: 2, ... })`.
 */
const MIGRATIONS: Record<
	number,
	(doc: Record<string, unknown>) => Record<string, unknown>
> = {};

/** Upgrades a document to the current version, or says why it can't. */
export function migrate(
	input: Record<string, unknown>
): Record<string, unknown> | DocumentProblem {
	let doc = input;
	if (typeof doc.version !== "number")
		return { path: "version", message: "A document needs a version number" };
	if (doc.version > DOCUMENT_VERSION)
		return {
			path: "version",
			message: `Version ${doc.version} is newer than this package reads (${DOCUMENT_VERSION}). Update the package.`,
		};
	while ((doc.version as number) < DOCUMENT_VERSION) {
		const step = MIGRATIONS[doc.version as number];
		if (!step)
			return {
				path: "version",
				message: `There's no upgrade from version ${doc.version}`,
			};
		doc = step(doc);
	}
	return doc;
}

const isProblem = (value: unknown): value is DocumentProblem =>
	typeof value === "object" &&
	value !== null &&
	"message" in value &&
	"path" in value;

/**
 * Reads a document from JSON text or a parsed object: parses, upgrades
 * older versions, and validates. Problems come with the path where they are.
 */
export function loadDocument(input: string | unknown): LoadResult {
	let raw: unknown = input;
	if (typeof input === "string") {
		try {
			raw = JSON.parse(input);
		} catch (error) {
			return {
				ok: false,
				problems: [
					{ path: "", message: `Not valid JSON: ${(error as Error).message}` },
				],
			};
		}
	}
	if (typeof raw !== "object" || raw === null || Array.isArray(raw))
		return {
			ok: false,
			problems: [{ path: "", message: "A document is a JSON object" }],
		};

	const migrated = migrate(raw as Record<string, unknown>);
	if (isProblem(migrated)) return { ok: false, problems: [migrated] };

	const parsed = documentSchema.safeParse(migrated);
	if (!parsed.success)
		return {
			ok: false,
			problems: parsed.error.issues.map((issue) => ({
				path: issue.path.join("."),
				message: issue.message,
			})),
		};
	return { ok: true, document: parsed.data as DesignDocument };
}

/** The document's JSON Schema, for validating documents in other languages. */
export const documentJsonSchema = () =>
	z.toJSONSchema(documentSchema, { io: "input", target: "draft-2020-12" });
