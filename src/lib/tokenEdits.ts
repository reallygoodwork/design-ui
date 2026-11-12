import {
	aliasOf,
	referencesOf,
	type Token,
	type TokenModeValue,
	type TokenType,
	tokenCssName,
} from "./tokens";

/* ── Editing ───────────────────────────────────────────────────────────── */

const PATH = /^[a-z0-9]+(?:[-_][a-z0-9]+)*(?:\.[a-z0-9]+(?:[-_][a-z0-9]+)*)*$/i;

/** Why a path can't be used, or null when it can. */
export function pathProblem(
	path: string,
	tokens: readonly Token[],
	except?: string
): string | null {
	if (!path.trim()) return "Give it a name";
	if (!PATH.test(path))
		return "Use letters, numbers and dots, like color.bg.page";
	const taken = tokens.some(
		(token) =>
			token.path !== except &&
			(token.path === path || tokenCssName(token.path) === tokenCssName(path))
	);
	return taken ? "That name is taken" : null;
}

const sameWhen = (a: Record<string, string>, b: Record<string, string>) =>
	Object.keys(a).length === Object.keys(b).length &&
	Object.entries(a).every(([key, value]) => b[key] === value);

/** Sets the value for one mode, or removes it with `null`. */
export function setModeValue(
	token: Token,
	when: Record<string, string>,
	value: string | null
): Token {
	const rest = (token.modes ?? []).filter(
		(entry) => !sameWhen(entry.when, when)
	);
	const modes: TokenModeValue[] =
		value === null ? rest : [...rest, { when, value }];
	return { ...token, modes: modes.length ? modes : undefined };
}

/** Tokens that read `path` in any of their values, as an alias or inside a composed value. */
export function dependentsOf(tokens: readonly Token[], path: string): Token[] {
	return tokens.filter((token) =>
		[token.value, ...(token.modes ?? []).map((entry) => entry.value)].some(
			(value) => referencesOf(value).includes(path)
		)
	);
}

/** Renames a token and every alias that points at it. */
export function renameToken(
	tokens: readonly Token[],
	from: string,
	to: string
): Token[] {
	// Aliases and references inside composed values alike.
	const swap = (value: string) => value.replaceAll(`{${from}}`, `{${to}}`);
	return tokens.map((token) => ({
		...token,
		path: token.path === from ? to : token.path,
		value: swap(token.value),
		modes: token.modes?.map((entry) => ({
			...entry,
			value: swap(entry.value),
		})),
	}));
}

/** A best guess at a raw CSS value's token type. */
export function guessTokenType(value: string): TokenType {
	const v = value.trim();
	if (/^(#[0-9a-f]{3,8}|(rgb|hsl|oklch|oklab|lab|lch)a?\(.*\))$/i.test(v))
		return "color";
	if (/^-?[\d.]+(px|rem|em|%|vw|vh|ch)$/.test(v)) return "dimension";
	if (/\d(px|rem|em).*(#|rgb|hsl|oklch)/.test(v)) return "shadow";
	if (/^-?[\d.]+$/.test(v)) return "number";
	if (/serif|sans|mono|system-ui|['"]/.test(v)) return "fontFamily";
	return "dimension";
}

/** `--brand-red` → `brand.red`. */
export const pathFromCssName = (name: string) =>
	name.replace(/^--/, "").replaceAll("-", ".");

/* ── Reading custom properties out of CSS ──────────────────────────────── */

export type CssDeclaration = { name: string; value: string; selector: string };

/**
 * Every custom property a stylesheet declares, with its selector. Reads the
 * innermost `selector { … }` blocks, so rules inside `@media` count too.
 */
export function scanCssVariables(css: string): CssDeclaration[] {
	const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
	const found: CssDeclaration[] = [];
	for (const block of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		const selector = block[1].trim().replace(/\s+/g, " ");
		for (const decl of block[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) {
			found.push({ name: decl[1], value: decl[2].trim(), selector });
		}
	}
	return found;
}

export type ImportCandidate = CssDeclaration & {
	path: string;
	type: TokenType;
	/** The token's value: raw, or `{alias}` when the CSS reads another variable. */
	tokenValue: string;
	status:
		| { kind: "new" }
		| { kind: "same"; token: string }
		| { kind: "duplicate"; token: string }
		| { kind: "conflict"; token: string; value: string }
		| { kind: "broken"; missing: string };
};

/**
 * What importing a stylesheet's variables would do. A variable that reads
 * another (`var(--x)`) becomes an alias: to the token `--x` already is, to
 * the token `--x` duplicates, or to `--x` imported alongside it. Otherwise
 * it's broken. `resolve` gives a token's value in the default mode.
 */
export function importCandidates(
	declarations: readonly CssDeclaration[],
	tokens: readonly Token[],
	resolve: (path: string) => string | undefined
): ImportCandidate[] {
	const byCssName = new Map(
		tokens.map((token) => [tokenCssName(token.path), token])
	);
	// The last declaration of a name wins, like the cascade.
	const unique = [...new Map(declarations.map((d) => [d.name, d])).values()];
	const refOf = (d: CssDeclaration) =>
		d.value.match(/^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/)?.[1];

	// Raw values first, so variables that read them know where they landed.
	const raw = new Map<string, ImportCandidate>();
	for (const d of unique) {
		if (refOf(d)) continue;
		const existing = byCssName.get(d.name);
		const type = existing?.type ?? guessTokenType(d.value);
		const base = {
			...d,
			path: existing?.path ?? pathFromCssName(d.name),
			type,
			tokenValue: d.value,
		};
		if (existing) {
			const current = resolve(existing.path);
			raw.set(
				d.name,
				current?.toLowerCase() === d.value.toLowerCase()
					? { ...base, status: { kind: "same", token: existing.path } }
					: {
							...base,
							status: {
								kind: "conflict",
								token: existing.path,
								value: current ?? existing.value,
							},
						}
			);
			continue;
		}
		const twin = tokens.find(
			(token) =>
				token.type === type &&
				resolve(token.path)?.toLowerCase() === d.value.toLowerCase()
		);
		raw.set(d.name, {
			...base,
			status: twin ? { kind: "duplicate", token: twin.path } : { kind: "new" },
		});
	}

	return unique.map((d) => {
		const ref = refOf(d);
		if (!ref) return raw.get(d.name) as ImportCandidate;
		const existing = byCssName.get(d.name);
		const path = existing?.path ?? pathFromCssName(d.name);
		const known = byCssName.get(ref);
		const imported = raw.get(ref);
		const chained = unique.some((other) => other.name === ref);
		const target =
			known?.path ??
			(imported?.status.kind === "duplicate"
				? imported.status.token
				: imported?.path) ??
			(chained ? pathFromCssName(ref) : undefined);
		const type = known?.type ?? imported?.type ?? "dimension";
		if (!target) {
			return {
				...d,
				path,
				type,
				tokenValue: d.value,
				status: { kind: "broken", missing: ref },
			};
		}
		return {
			...d,
			path,
			type,
			tokenValue: `{${target}}`,
			status: existing
				? { kind: "same", token: existing.path }
				: { kind: "new" },
		};
	});
}

/* ── Editing modes ─────────────────────────────────────────────────────── */

const mapEntries = (
	tokens: readonly Token[],
	change: (entry: TokenModeValue) => TokenModeValue | null
) =>
	tokens.map((token) => {
		if (!token.modes) return token;
		const modes = token.modes.flatMap((entry) => {
			const next = change(entry);
			return next ? [next] : [];
		});
		return { ...token, modes: modes.length ? modes : undefined };
	});

/** Why a dimension or mode name can't be used, or null when it can. */
export function modeNameProblem(
	name: string,
	taken: readonly string[]
): string | null {
	if (!name.trim()) return "Give it a name";
	if (!/^[a-z0-9][\w-]*$/i.test(name))
		return "Letters, numbers and dashes only";
	return taken.includes(name) ? "That name is taken" : null;
}

/** Renames one value of a dimension in every token that uses it. */
export function renameModeValue(
	tokens: readonly Token[],
	dimension: string,
	from: string,
	to: string
): Token[] {
	return mapEntries(tokens, (entry) =>
		entry.when[dimension] === from
			? { ...entry, when: { ...entry.when, [dimension]: to } }
			: entry
	);
}

/** Drops every value set for one value of a dimension. */
export function removeModeValue(
	tokens: readonly Token[],
	dimension: string,
	value: string
): Token[] {
	return mapEntries(tokens, (entry) =>
		entry.when[dimension] === value ? null : entry
	);
}

/** Renames a dimension in every token that varies by it. */
export function renameDimension(
	tokens: readonly Token[],
	from: string,
	to: string
): Token[] {
	return mapEntries(tokens, (entry) => {
		if (!(from in entry.when)) return entry;
		const { [from]: value, ...rest } = entry.when;
		return { ...entry, when: { ...rest, [to]: value } };
	});
}

/** Drops every value that depends on a dimension. */
export function removeDimension(
	tokens: readonly Token[],
	dimension: string
): Token[] {
	return mapEntries(tokens, (entry) =>
		dimension in entry.when ? null : entry
	);
}
