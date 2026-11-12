import * as z from "zod";
import { isPrimaryBreakpoint } from "./breakpointUtils";
import { getNode, type NodeMap, normalize } from "./layerTree";
import type { Action } from "./reducer";
import type { Breakpoint, Layer, LayerNode } from "./types";

/**
 * Editing rules: what people in the editor role (and every agent) may change.
 * A document with no rules allows everything. Builders aren't limited by
 * rules and are the ones who set them.
 */
export type Role = "builder" | "editor";

/** Named groups of properties, so a rule can say "color" instead of listing each one. */
export const PROPERTY_GROUPS: Record<string, string[]> = {
	color: ["--color", "--background-color", "--border-color"],
	typography: [
		"--font-family",
		"--font-size",
		"--font-weight",
		"--line-height",
		"--letter-spacing",
		"--text-align",
		"--text-transform",
		"--text-decoration",
	],
	spacing: [
		"--padding-block-start",
		"--padding-block-end",
		"--padding-inline-start",
		"--padding-inline-end",
		"--margin-block-start",
		"--margin-block-end",
		"--margin-inline-start",
		"--margin-inline-end",
		"--row-gap",
		"--column-gap",
	],
	size: [
		"--width",
		"--height",
		"--min-width",
		"--min-height",
		"--max-width",
		"--max-height",
	],
};

const valueConstraintSchema = z.union([
	z.object({ tokensOnly: z.literal(true) }),
	z.object({
		min: z.number().optional(),
		max: z.number().optional(),
		unit: z
			.string()
			.optional()
			.describe("Like px; values in other units are rejected"),
	}),
	z.object({ oneOf: z.array(z.string()).min(1) }),
]);

export type ValueConstraint = z.infer<typeof valueConstraintSchema>;

export const ruleSchema = z
	.object({
		id: z.string().min(1),
		/** Shown to people and agents when the rule blocks something. */
		message: z.string().optional(),
		target: z
			.object({
				layerTypes: z.array(z.string()).optional(),
				layerIds: z.array(z.string()).optional(),
				/** Also apply to everything inside the matched layers. */
				includeChildren: z.boolean().optional(),
			})
			.default({})
			.describe("Which layers it covers. Empty covers every layer."),
		/** Only these properties may change. Use `group:color` for a group. */
		editableProperties: z.array(z.string()).optional(),
		/** Limits on values, by property or `group:<name>`. */
		values: z.record(z.string(), valueConstraintSchema).optional(),
		/** Whether text and image sources may change. */
		content: z.enum(["editable", "locked"]).optional(),
		structure: z
			.object({
				/** No adding, deleting, moving or duplicating inside. */
				locked: z.boolean().optional(),
				/** Layer types that may be added inside, like ["text", "image"]. */
				allowedChildren: z.array(z.string()).optional(),
				minChildren: z.number().int().min(0).optional(),
				maxChildren: z.number().int().min(0).optional(),
			})
			.optional(),
		/** Whether larger breakpoints may override the base styles. */
		breakpointOverrides: z.boolean().optional(),
	})
	.describe("One editing rule");

export type Rule = z.infer<typeof ruleSchema>;

export const rulesSchema = z.array(ruleSchema);

/** What the rules need to see: the layers, the breakpoints and the rules. */
export type RulesContext = {
	nodes: NodeMap;
	breakpoints: Breakpoint[];
	rules: readonly Rule[];
};

export type Rejection = { ruleId: string; message: string };

/** What a role may change on one layer. Plain data, so agents can read it. */
export type Allowed = {
	/** Null means any property. */
	editableProperties: string[] | null;
	values: Record<string, ValueConstraint[]>;
	content: boolean;
	structureLocked: boolean;
	/** Null means any type. */
	allowedChildren: string[] | null;
	minChildren?: number;
	maxChildren?: number;
	breakpointOverrides: boolean;
};

const EVERYTHING: Allowed = {
	editableProperties: null,
	values: {},
	content: true,
	structureLocked: false,
	allowedChildren: null,
	breakpointOverrides: true,
};

/** Expands `group:<name>` into its properties. */
const expand = (names: string[]) =>
	names.flatMap((name) =>
		name.startsWith("group:") ? (PROPERTY_GROUPS[name.slice(6)] ?? []) : [name]
	);

const ancestors = (nodes: NodeMap, id: string) => {
	const out: LayerNode[] = [];
	let parentId = getNode(nodes, id)?.parentId ?? null;
	while (parentId) {
		const parent = getNode(nodes, parentId);
		if (!parent) break;
		out.push(parent);
		parentId = parent.parentId;
	}
	return out;
};

const targets = (rule: Rule, node: LayerNode) => {
	const { layerTypes, layerIds } = rule.target;
	if (!layerTypes?.length && !layerIds?.length) return true;
	return Boolean(
		layerTypes?.includes(node.type) || layerIds?.includes(node.id)
	);
};

/** Rules covering a layer: its own, and those of ancestors that include children. */
export const rulesFor = (ctx: RulesContext, layerId: string): Rule[] => {
	const node = getNode(ctx.nodes, layerId);
	if (!node) return [];
	const above = ancestors(ctx.nodes, layerId);
	return ctx.rules.filter(
		(rule) =>
			targets(rule, node) ||
			(rule.target.includeChildren && above.some((a) => targets(rule, a)))
	);
};

const intersect = (a: string[] | null, b: string[]) =>
	a === null ? b : a.filter((x) => b.includes(x));

/** Combines every rule on a layer, keeping the strictest of each. */
export const allowed = (
	ctx: RulesContext,
	layerId: string,
	role: Role
): Allowed => {
	if (role === "builder") return EVERYTHING;
	const result: Allowed = { ...EVERYTHING, values: {} };
	for (const rule of rulesFor(ctx, layerId)) {
		if (rule.editableProperties)
			result.editableProperties = intersect(
				result.editableProperties,
				expand(rule.editableProperties)
			);
		for (const [key, constraint] of Object.entries(rule.values ?? {}))
			for (const property of expand([key]))
				result.values[property] = [
					...(result.values[property] ?? []),
					constraint,
				];
		if (rule.content === "locked") result.content = false;
		if (rule.breakpointOverrides === false) result.breakpointOverrides = false;
		if (rule.structure) mergeStructure(result, rule.structure);
	}
	return result;
};

/** Adds one rule's structure limits to `result`, keeping the strictest. */
const mergeStructure = (result: Allowed, s: NonNullable<Rule["structure"]>) => {
	if (s.locked) result.structureLocked = true;
	if (s.allowedChildren)
		result.allowedChildren = intersect(
			result.allowedChildren,
			s.allowedChildren
		);
	if (s.minChildren !== undefined)
		result.minChildren = Math.max(result.minChildren ?? 0, s.minChildren);
	if (s.maxChildren !== undefined)
		result.maxChildren = Math.min(
			result.maxChildren ?? Infinity,
			s.maxChildren
		);
};

/** Whether a layer can take another child under these limits (ignoring its count). */
export const acceptsChildren = (a: Allowed) =>
	!a.structureLocked &&
	(a.allowedChildren === null || a.allowedChildren.length > 0);

/** The first rule on a layer that sets `pick`, for naming it in a message. */
const blamed = (
	ctx: RulesContext,
	layerId: string,
	pick: (rule: Rule) => boolean
) => rulesFor(ctx, layerId).find(pick);

const reject = (rule: Rule | undefined, fallback: string): Rejection => ({
	ruleId: rule?.id ?? "rules",
	message: rule?.message ?? fallback,
});

const label = (property: string) =>
	property.replace(/^--/, "").replaceAll("-", " ");
const nameOf = (ctx: RulesContext, id: string) =>
	getNode(ctx.nodes, id)?.name ?? "This layer";

/** Why a value breaks a constraint, or null when it doesn't. */
export const valueProblem = (
	value: string,
	constraint: ValueConstraint
): string | null => {
	if ("tokensOnly" in constraint)
		return /^var\(\s*--[\w-]+\s*\)$/.test(value.trim()) ? null : "use a token";
	if ("oneOf" in constraint)
		return constraint.oneOf.includes(value)
			? null
			: `use one of ${constraint.oneOf.join(", ")}`;
	const match = value.trim().match(/^(-?\d*\.?\d+)([a-z%]*)$/i);
	if (!match) return "use a number";
	const [, num, unit] = match;
	if (constraint.unit !== undefined && unit !== constraint.unit)
		return `use ${constraint.unit}`;
	const n = Number(num);
	if (constraint.min !== undefined && n < constraint.min)
		return `use at least ${constraint.min}${constraint.unit ?? ""}`;
	if (constraint.max !== undefined && n > constraint.max)
		return `use at most ${constraint.max}${constraint.unit ?? ""}`;
	return null;
};

const cssProblem = (
	ctx: RulesContext,
	role: Role,
	id: string,
	css: Record<string, string>,
	breakpointId: string | undefined
): Rejection | null => {
	const a = allowed(ctx, id, role);
	const name = nameOf(ctx, id);
	if (
		breakpointId &&
		!a.breakpointOverrides &&
		!isPrimaryBreakpoint(breakpointId, ctx.breakpoints)
	)
		return reject(
			blamed(ctx, id, (r) => r.breakpointOverrides === false),
			`${name} has the same styles at every breakpoint`
		);
	for (const [property, value] of Object.entries(css)) {
		if (a.editableProperties && !a.editableProperties.includes(property))
			return reject(
				blamed(ctx, id, (r) => Boolean(r.editableProperties)),
				`${name}'s ${label(property)} can't be changed`
			);
		// Clearing a value goes back to what it inherits, which is always allowed.
		if (!value) continue;
		for (const constraint of a.values[property] ?? []) {
			const problem = valueProblem(value, constraint);
			if (problem)
				return reject(
					blamed(ctx, id, (r) =>
						Object.keys(r.values ?? {}).some((k) =>
							expand([k]).includes(property)
						)
					),
					`${name}'s ${label(property)}: ${problem}`
				);
		}
	}
	return null;
};

/** The layer an action adds into, removes from or moves within. */
const parentOf = (ctx: RulesContext, id: string) =>
	getNode(ctx.nodes, id)?.parentId ?? null;

const structureProblem = (
	ctx: RulesContext,
	role: Role,
	parentId: string | null,
	change: { adding?: string; removing?: number }
): Rejection | null => {
	if (!parentId) return null;
	const a = allowed(ctx, parentId, role);
	const name = nameOf(ctx, parentId);
	if (a.structureLocked)
		return reject(
			blamed(ctx, parentId, (r) => Boolean(r.structure?.locked)),
			`${name} is locked: its layers can't be added, removed or moved`
		);
	const count = getNode(ctx.nodes, parentId)?.childIds?.length ?? 0;
	if (change.adding !== undefined) {
		if (a.allowedChildren && !a.allowedChildren.includes(change.adding))
			return reject(
				blamed(ctx, parentId, (r) => Boolean(r.structure?.allowedChildren)),
				`${name} can only hold ${a.allowedChildren.join(", ")}`
			);
		if (a.maxChildren !== undefined && count + 1 > a.maxChildren)
			return reject(
				blamed(ctx, parentId, (r) => r.structure?.maxChildren !== undefined),
				`${name} holds at most ${a.maxChildren}`
			);
	}
	if (
		change.removing &&
		a.minChildren !== undefined &&
		count - change.removing < a.minChildren
	)
		return reject(
			blamed(ctx, parentId, (r) => r.structure?.minChildren !== undefined),
			`${name} needs at least ${a.minChildren}`
		);
	return null;
};

type Check = (
	ctx: RulesContext,
	action: Action,
	role: Role
) => Rejection | null;

const CHECKS: Partial<Record<Action["type"], Check>> = {
	UPDATE_LAYER_CSS: (ctx, action, role) => {
		const { id, css, breakpointId } = (
			action as Extract<Action, { type: "UPDATE_LAYER_CSS" }>
		).payload;
		return cssProblem(ctx, role, id, css, breakpointId ?? undefined);
	},
	UPDATE_LAYER_VALUE: (ctx, action, role) => {
		const { id } = (action as Extract<Action, { type: "UPDATE_LAYER_VALUE" }>)
			.payload;
		return allowed(ctx, id, role).content
			? null
			: reject(
					blamed(ctx, id, (r) => r.content === "locked"),
					`${nameOf(ctx, id)}'s content is locked`
				);
	},
	UPDATE_LAYER_ELEMENT_TYPE: (ctx, action, role) => {
		const { layerId } = (
			action as Extract<Action, { type: "UPDATE_LAYER_ELEMENT_TYPE" }>
		).payload;
		return structureProblem(ctx, role, parentOf(ctx, layerId), {});
	},
	ADD_LAYER: (ctx, action, role) => {
		const { layer, targetLayerId, position } = (
			action as Extract<Action, { type: "ADD_LAYER" }>
		).payload;
		const parent =
			position === "inside" ? targetLayerId : parentOf(ctx, targetLayerId);
		return structureProblem(ctx, role, parent, { adding: layer.type });
	},
	DELETE_LAYERS: (ctx, action, role) => {
		const { layerIds } = (action as Extract<Action, { type: "DELETE_LAYERS" }>)
			.payload;
		const byParent = new Map<string | null, number>();
		for (const id of layerIds)
			byParent.set(
				parentOf(ctx, id),
				(byParent.get(parentOf(ctx, id)) ?? 0) + 1
			);
		for (const [parent, removing] of byParent) {
			const problem = structureProblem(ctx, role, parent, { removing });
			if (problem) return problem;
		}
		return null;
	},
	MOVE_LAYER: (ctx, action, role) => {
		const { layerIds, targetId, position } = (
			action as Extract<Action, { type: "MOVE_LAYER" }>
		).payload;
		const into = position === "on" ? targetId : parentOf(ctx, targetId);
		for (const id of layerIds) {
			const from = parentOf(ctx, id);
			if (from === into) {
				const problem = structureProblem(ctx, role, from, {});
				if (problem) return problem;
				continue;
			}
			const type = getNode(ctx.nodes, id)?.type ?? "";
			const problem =
				structureProblem(ctx, role, from, { removing: 1 }) ??
				structureProblem(ctx, role, into, { adding: type });
			if (problem) return problem;
		}
		return null;
	},
};

/**
 * Whether a role may make this change. Actions the rules don't cover, like
 * selecting or zooming, are always allowed.
 */
export const checkAction = (
	ctx: RulesContext,
	action: Action,
	role: Role
): Rejection | null => {
	if (role === "builder") return null;
	// Checked before the no-rules shortcut: only builders set rules, even the first.
	if (action.type === "SET_RULES")
		return {
			ruleId: "builder-only",
			message: "Only builders can change the rules",
		};
	if (ctx.rules.length === 0) return null;
	return CHECKS[action.type]?.(ctx, action, role) ?? null;
};

export type Violation = Rejection & { layerId: string; property?: string };

const blamedForValue = (ctx: RulesContext, layerId: string, property: string) =>
	blamed(ctx, layerId, (r) =>
		Object.keys(r.values ?? {}).some((k) => expand([k]).includes(property))
	);

/** Styles on a layer that break a value rule. */
const valueViolations = (
	ctx: RulesContext,
	node: LayerNode,
	a: Allowed
): Violation[] => {
	const styles = [
		...Object.entries(node.cssVars ?? {}),
		...Object.values(node.breakpointCssVars ?? {}).flatMap(Object.entries),
	];
	return styles.flatMap(([property, value]) =>
		(a.values[property] ?? []).flatMap((constraint) => {
			const problem = value ? valueProblem(value, constraint) : null;
			if (!problem) return [];
			return [
				{
					...reject(
						blamedForValue(ctx, node.id, property),
						`${node.name}'s ${label(property)}: ${problem}`
					),
					layerId: node.id,
					property,
				},
			];
		})
	);
};

/** Children a layer isn't allowed, or too many or too few of them. */
const childViolations = (
	ctx: RulesContext,
	node: LayerNode,
	a: Allowed
): Violation[] => {
	const children = (node.childIds ?? []).flatMap((id) => {
		const child = getNode(ctx.nodes, id);
		return child ? [child] : [];
	});
	const violation = (
		pick: (r: Rule) => boolean,
		message: string
	): Violation => ({
		...reject(blamed(ctx, node.id, pick), message),
		layerId: node.id,
	});
	const out: Violation[] = [];
	const allowedTypes = a.allowedChildren;
	if (allowedTypes)
		for (const child of children)
			if (!allowedTypes.includes(child.type))
				out.push(
					violation(
						(r) => Boolean(r.structure?.allowedChildren),
						`${node.name} can only hold ${allowedTypes.join(", ")}, but has ${child.name}`
					)
				);
	if (a.maxChildren !== undefined && children.length > a.maxChildren)
		out.push(
			violation(
				(r) => r.structure?.maxChildren !== undefined,
				`${node.name} holds at most ${a.maxChildren}, but has ${children.length}`
			)
		);
	if (a.minChildren !== undefined && children.length < a.minChildren)
		out.push(
			violation(
				(r) => r.structure?.minChildren !== undefined,
				`${node.name} needs at least ${a.minChildren}, but has ${children.length}`
			)
		);
	return out;
};

/** Every place a document breaks its own rules, e.g. after editing it by hand. */
export const checkDocument = (doc: {
	layers: Layer[];
	breakpoints: Breakpoint[];
	rules: readonly Rule[];
}): Violation[] => {
	const { nodes } = normalize(doc.layers);
	const ctx: RulesContext = {
		nodes,
		breakpoints: doc.breakpoints,
		rules: doc.rules,
	};
	return Object.values(nodes).flatMap((node) => {
		const a = allowed(ctx, node.id, "editor");
		return [...valueViolations(ctx, node, a), ...childViolations(ctx, node, a)];
	});
};

/** The id of the rule a builder sets on one layer from the editor. */
export const layerRuleId = (layerId: string) => `layer-${layerId}`;

const coversOnly = (rule: Rule, layerId: string) =>
	!rule.target.layerTypes?.length &&
	rule.target.layerIds?.length === 1 &&
	rule.target.layerIds[0] === layerId;

/** The rule that covers this one layer and nothing else, if there is one. */
export const ownRule = (
	rules: readonly Rule[],
	layerId: string
): Rule | undefined => rules.find((rule) => coversOnly(rule, layerId));

/** Drops limits that say nothing, so an emptied rule can be removed. */
const tidy = ({ values, content, structure, ...rest }: Rule): Rule => {
	const kept = Object.fromEntries(
		Object.entries(structure ?? {}).filter(
			([key, value]) =>
				value !== undefined && !(key === "locked" && value === false)
		)
	);
	return {
		...rest,
		...(values && Object.keys(values).length ? { values } : {}),
		...(content === "locked" ? { content } : {}),
		...(Object.keys(kept).length ? { structure: kept } : {}),
	};
};

const limitsNothing = (rule: Rule) =>
	!rule.editableProperties &&
	!rule.values &&
	!rule.content &&
	!rule.structure &&
	rule.breakpointOverrides === undefined;

/**
 * The rules after changing the one that covers this layer alone, creating
 * it when there isn't one. A rule left limiting nothing is removed.
 */
export const updateLayerRule = (
	rules: readonly Rule[],
	layerId: string,
	change: (rule: Rule) => Rule
): Rule[] => {
	const current = ownRule(rules, layerId);
	const next = tidy(
		change(
			current ?? { id: layerRuleId(layerId), target: { layerIds: [layerId] } }
		)
	);
	const keep = !limitsNothing(next);
	if (!current) return keep ? [...rules, next] : [...rules];
	return rules.flatMap((rule) =>
		rule === current ? (keep ? [next] : []) : [rule]
	);
};
