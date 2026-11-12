/**
 * Design tokens, shaped like the W3C Design Tokens format (DTCG): each token
 * has a `$type`-like `type`, a value, and may alias another token with
 * `{path.to.token}`. Names become CSS custom properties the way Style
 * Dictionary names them: `color.bg.page` → `--color-bg-page`.
 *
 * A token can vary by mode. Modes are dimensions such as brand or theme, set
 * for the whole editor, plus `breakpoint`, which each frame sets for itself.
 */

export type TokenType =
	| "color"
	| "dimension"
	| "fontFamily"
	| "fontWeight"
	| "number"
	| "shadow";

/** Primitives hold raw values, semantic tokens say what they're for, component tokens belong to one part. */
export type TokenTier = "primitive" | "semantic" | "component";

/** One value, used when every dimension in `when` matches the active mode. */
export type TokenModeValue = { when: Record<string, string>; value: string };

export type Token = {
	path: string;
	type: TokenType;
	tier: TokenTier;
	/** The default value, used when no mode entry matches. */
	value: string;
	modes?: TokenModeValue[];
	description?: string;
};

/** The active value of each dimension, plus `breakpoint`. */
export type TokenMode = Record<string, string>;

/** Dimensions besides `breakpoint`, each with its values. The first is the default. */
export type TokenDimensions = Record<string, string[]>;

export const BREAKPOINT_DIMENSION = "breakpoint";

export const tokenCssName = (path: string) => `--${path.replaceAll(".", "-")}`;

export const tokenCssValue = (path: string) => `var(${tokenCssName(path)})`;

const ALIAS = /^\{([^}]+)\}$/;

/** The path a value aliases, if it is an alias like `{color.neutral.900}`. */
export const aliasOf = (value: string | undefined) => value?.match(ALIAS)?.[1];

/** The token a layer value points at, if it is exactly `var(--token-name)`. */
export function tokenFromCssValue(
	value: string | undefined,
	tokens: readonly Token[]
) {
	const name = value?.match(/^var\(\s*(--[\w-]+)\s*\)$/)?.[1];
	return name
		? tokens.find((token) => tokenCssName(token.path) === name)
		: undefined;
}

export const indexTokens = (tokens: readonly Token[]) =>
	new Map(tokens.map((token) => [token.path, token]));

/**
 * Which of a token's values applies in `mode`.
 *
 * An entry is a candidate when every dimension it names matches the mode.
 * `breakpoint` cascades mobile-first: an entry for a breakpoint also applies
 * to every larger one, like layer styles do. Among candidates, the one naming
 * the most dimensions wins, then the one set at the larger breakpoint, then
 * the later entry. With no candidate, the default value applies.
 *
 * @param breakpointOrder breakpoint ids from smallest to largest
 */
export function pickModeValue(
	token: Token,
	mode: TokenMode,
	breakpointOrder: readonly string[] = []
): string {
	let best: TokenModeValue | undefined;
	let bestScore: [number, number] = [-1, -1];
	const current = breakpointOrder.indexOf(mode[BREAKPOINT_DIMENSION] ?? "");

	for (const entry of token.modes ?? []) {
		let reach = -1;
		const matches = Object.entries(entry.when).every(([dimension, value]) => {
			if (dimension !== BREAKPOINT_DIMENSION) return mode[dimension] === value;
			const index = breakpointOrder.indexOf(value);
			if (index === -1 || current === -1 || index > current) return false;
			reach = index;
			return true;
		});
		if (!matches) continue;
		const score: [number, number] = [Object.keys(entry.when).length, reach];
		if (
			score[0] > bestScore[0] ||
			(score[0] === bestScore[0] && score[1] >= bestScore[1])
		) {
			best = entry;
			bestScore = score;
		}
	}
	return best ? best.value : token.value;
}

const REFERENCE = /\{([^{}\s]+)\}/g;

/**
 * Every token a value reads: the alias, or each `{path}` inside a composed
 * value like `color-mix(in oklch, {color.a} 40%, {color.b})`.
 */
export const referencesOf = (value: string | undefined): string[] =>
	value
		? [...new Set([...value.matchAll(REFERENCE)].map((match) => match[1]))]
		: [];

/** A value that builds on other tokens inside a CSS function or expression. */
export const isComposed = (value: string | undefined) =>
	!aliasOf(value) && referencesOf(value).length > 0;

export type TokenResolution = {
	value?: string;
	/** The alias path walked, starting with the token itself. */
	chain: string[];
	/** Every token read along the way, through aliases and composed values. */
	deps: string[];
	error?:
		| { kind: "unresolved"; missing: string }
		| { kind: "circular"; cycle: string[] }
		| { kind: "type"; expected: TokenType; got: TokenType; via: string };
};

type Step = Omit<TokenResolution, "deps">;

/**
 * Resolves values in one mode. An alias must keep the type it started with;
 * a reference inside a composed value can be any type, so a number token can
 * set a color's alpha.
 */
function resolver(
	mode: TokenMode,
	byPath: ReadonlyMap<string, Token>,
	breakpointOrder: readonly string[]
) {
	const deps = new Set<string>();

	const resolveRaw = (
		raw: string,
		stack: string[],
		expected: TokenType | undefined
	): Step => {
		const alias = aliasOf(raw);
		if (alias) return resolvePath(alias, stack, expected);
		let out = raw;
		for (const ref of referencesOf(raw)) {
			const step = resolvePath(ref, stack, undefined);
			if (step.error) return { chain: [], error: step.error };
			out = out.replaceAll(`{${ref}}`, step.value ?? "");
		}
		return { value: out, chain: [] };
	};

	const resolvePath = (
		path: string,
		stack: string[],
		expected: TokenType | undefined
	): Step => {
		if (stack.includes(path)) {
			return {
				chain: [path],
				error: { kind: "circular", cycle: [...stack, path] },
			};
		}
		const token = byPath.get(path);
		if (!token)
			return { chain: [path], error: { kind: "unresolved", missing: path } };
		if (expected && token.type !== expected) {
			return {
				chain: [path],
				error: { kind: "type", expected, got: token.type, via: path },
			};
		}
		deps.add(path);
		const raw = pickModeValue(token, mode, breakpointOrder);
		const step = resolveRaw(
			raw,
			[...stack, path],
			aliasOf(raw) ? (expected ?? token.type) : undefined
		);
		return { ...step, chain: aliasOf(raw) ? [path, ...step.chain] : [path] };
	};

	return { deps, resolvePath, resolveRaw };
}

/** Follows aliases and composed values to a CSS value, or to what went wrong. */
export function resolveToken(
	path: string,
	mode: TokenMode,
	byPath: ReadonlyMap<string, Token>,
	breakpointOrder: readonly string[] = []
): TokenResolution {
	const r = resolver(mode, byPath, breakpointOrder);
	const step = r.resolvePath(path, [], undefined);
	return { ...step, deps: [...r.deps] };
}

/** Resolves a value that isn't saved as a token yet, like one being typed. */
export function resolveTokenValue(
	raw: string,
	mode: TokenMode,
	byPath: ReadonlyMap<string, Token>,
	breakpointOrder: readonly string[] = [],
	type?: TokenType
): TokenResolution {
	const r = resolver(mode, byPath, breakpointOrder);
	const step = r.resolveRaw(raw, [], aliasOf(raw) ? type : undefined);
	return { ...step, deps: [...r.deps] };
}

/** Custom properties for one frame. Tokens that don't resolve are left out. */
export function tokensToCssVars(
	tokens: readonly Token[],
	mode: TokenMode,
	breakpointOrder: readonly string[] = []
): Record<string, string> {
	const byPath = indexTokens(tokens);
	const vars: Record<string, string> = {};
	for (const token of tokens) {
		const resolved = resolveToken(token.path, mode, byPath, breakpointOrder);
		if (resolved.value !== undefined && !resolved.error) {
			vars[tokenCssName(token.path)] = resolved.value;
		}
	}
	return vars;
}

/** Every combination of the dimensions' values. */
export function allModes(dimensions: TokenDimensions): TokenMode[] {
	return Object.entries(dimensions).reduce<TokenMode[]>(
		(modes, [dimension, values]) =>
			modes.flatMap((mode) =>
				values.map((value) => ({ ...mode, [dimension]: value }))
			),
		[{}]
	);
}

/**
 * A token whose value equals a raw value, so a hardcoded value can become a
 * token. Semantic tokens come first because they keep working when the theme
 * changes. Default modes are tried first.
 */
export function matchingToken(
	raw: string,
	type: TokenType,
	tokens: readonly Token[],
	modes: readonly TokenMode[],
	breakpointOrder: readonly string[] = []
): Token | undefined {
	const byPath = indexTokens(tokens);
	const wanted = raw.trim().toLowerCase();
	// Tier first, then mode: a semantic token that fits in dark beats a
	// primitive that fits in light.
	for (const tier of ["semantic", "primitive"] as const) {
		const candidates = tokens.filter(
			(token) => token.type === type && token.tier === tier
		);
		for (const mode of modes) {
			const hit = candidates.find(
				(token) =>
					resolveToken(
						token.path,
						mode,
						byPath,
						breakpointOrder
					).value?.toLowerCase() === wanted
			);
			if (hit) return hit;
		}
	}
	return undefined;
}

export type TokenIssue = {
	id: string;
	severity: "error" | "warning";
	token: string;
	title: string;
	detail: string;
};

/**
 * Problems in a token set, checked in every mode so a broken dark value shows
 * up while you're looking at light.
 */
export function checkTokens(
	tokens: readonly Token[],
	dimensions: TokenDimensions,
	breakpointOrder: readonly string[] = []
): TokenIssue[] {
	const byPath = indexTokens(tokens);
	const issues = new Map<string, TokenIssue>();
	const add = (issue: TokenIssue) => {
		if (!issues.has(issue.id)) issues.set(issue.id, issue);
	};
	const modes = allModes(dimensions).flatMap((mode) =>
		breakpointOrder.length
			? breakpointOrder.map((bp) => ({ ...mode, [BREAKPOINT_DIMENSION]: bp }))
			: [mode]
	);

	for (const token of tokens) {
		for (const mode of modes) {
			const { error } = resolveToken(token.path, mode, byPath, breakpointOrder);
			if (error?.kind === "unresolved") {
				add({
					id: `unresolved:${token.path}`,
					severity: "error",
					token: token.path,
					title: `Points at {${error.missing}}, which doesn't exist`,
					detail: "Anything using this token falls back to its default.",
				});
			} else if (error?.kind === "circular") {
				add({
					id: `circular:${[...new Set(error.cycle)].sort().join()}`,
					severity: "error",
					token: token.path,
					title: "Circular reference",
					detail: error.cycle.join(" → "),
				});
			} else if (error?.kind === "type") {
				add({
					id: `type:${token.path}`,
					severity: "error",
					token: token.path,
					title: `A ${error.expected} that resolves to a ${error.got}`,
					detail: `Through ${error.via}.`,
				});
			}
		}

		// A token that varies by a dimension should say what to do for each of
		// its values. The first value is the default and may be left out.
		const single = (token.modes ?? []).filter(
			(entry) => Object.keys(entry.when).length === 1
		);
		for (const [dimension, values] of Object.entries(dimensions)) {
			if (!single.some((entry) => dimension in entry.when)) continue;
			for (const value of values.slice(1)) {
				if (!single.some((entry) => entry.when[dimension] === value)) {
					add({
						id: `missing:${token.path}:${dimension}:${value}`,
						severity: "warning",
						token: token.path,
						title: `No ${value} value`,
						detail: `It sets ${dimension} for other values, so ${value} gets the default (${token.value}).`,
					});
				}
			}
		}
	}
	return [...issues.values()];
}
