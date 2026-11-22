import { sortBreakpointsByWidth } from "./breakpointUtils";
import { applyCssVars } from "./cssPropertyMapping";
import { frameLayer } from "./layers/frame";
import { imageLayer } from "./layers/image";
import { inputLayer } from "./layers/input";
import { textLayer } from "./layers/text";
import {
	allModes,
	type Token,
	type TokenDimensions,
	type TokenMode,
	tokensToCssVars,
} from "./tokens";
import type { Breakpoint, CSSVars, Layer, LayerDefinition } from "./types";

/** The layer types every design can use. */
export const BUILT_IN_LAYERS: LayerDefinition[] = [
	frameLayer,
	textLayer,
	imageLayer,
	inputLayer,
];

/** The parts of a document a page is built from. */
export type RenderableDocument = {
	layers: Layer[];
	breakpoints: Breakpoint[];
	frameStyles?: CSSVars;
	tokens?: readonly Token[];
	tokenDimensions?: TokenDimensions;
};

export type ExportOptions = {
	/** Layer types beyond the built-in ones. */
	layerTypes?: LayerDefinition[];
	/** The class on the root element. Every rule is scoped under it. */
	rootClass?: string;
};

const ROOT = "design";

const kebab = (key: string) =>
	key
		.replace(/^(Webkit|Moz|ms)/, "-$1")
		.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
		.toLowerCase();

const escapeHtml = (text: string) =>
	text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");

const declarations = (style: Record<string, string | number>) =>
	Object.entries(style)
		.filter(([, value]) => value !== "" && value !== undefined)
		.map(([key, value]) => `${kebab(key)}:${value}`)
		.join(";");

const rule = (selector: string, style: Record<string, string | number>) => {
	const body = declarations(style);
	return body ? `${selector}{${body}}` : "";
};

/** Only the entries of `next` that differ from `prev`. */
const changed = <T extends Record<string, string | number>>(prev: T, next: T) =>
	Object.fromEntries(
		Object.entries(next).filter(([key, value]) => prev[key] !== value)
	) as T;

/** A layer's own styles at each breakpoint, smallest first (mobile-first cascade). */
const cascade = (layer: Layer, sorted: Breakpoint[]): CSSVars[] => {
	let effective: CSSVars = { ...layer.cssVars };
	return sorted.map((bp, index) => {
		if (index > 0)
			effective = { ...effective, ...layer.breakpointCssVars?.[bp.id] };
		return effective;
	});
};

type Styled = {
	/** Wrapper styles: width and height, like the editor's layer wrapper. */
	wrapper: Record<string, string>;
	element: Record<string, string | number>;
};

/** The wrapper and element styles a layer gets at one breakpoint, as on the canvas. */
const stylesAt = (vars: CSSVars, def: LayerDefinition | undefined): Styled => {
	const wrapper: Record<string, string> = {};
	if (vars["--width"]) wrapper.width = vars["--width"];
	if (vars["--height"]) wrapper.height = vars["--height"];
	return {
		wrapper,
		element: {
			...def?.html?.baseStyle,
			...applyCssVars(vars, def?.supportedCssProperties),
		},
	};
};

type Walked = { layer: Layer; className: string; def?: LayerDefinition };

/** Every layer with a short, stable class name, in document order. */
const walk = (layers: Layer[], defs: LayerDefinition[]): Walked[] => {
	const out: Walked[] = [];
	const visit = (list: Layer[]) => {
		for (const layer of list) {
			out.push({
				layer,
				className: `l${out.length}`,
				def: defs.find((d) => d.type === layer.type),
			});
			visit(layer.children ?? []);
		}
	};
	visit(layers);
	return out;
};

const media = (width: number, rules: string[]) => {
	const body = rules.filter(Boolean).join("");
	return body ? `@media (min-width:${width}px){${body}}` : "";
};

const modeSelector = (root: string, mode: TokenMode, defaults: TokenMode) => {
	const attrs = Object.entries(mode)
		.filter(([dim, value]) => defaults[dim] !== value)
		.map(([dim, value]) => `[data-${dim}="${value}"]`)
		.join("");
	return `.${root}${attrs}`;
};

/** Token custom properties for every mode and breakpoint, as rules on the root. */
const tokenCss = (
	doc: RenderableDocument,
	sorted: Breakpoint[],
	root: string
): string[] => {
	const tokens = doc.tokens ?? [];
	if (tokens.length === 0) return [];
	const dims = doc.tokenDimensions ?? {};
	const defaults: TokenMode = Object.fromEntries(
		Object.entries(dims).map(([dim, values]) => [dim, values[0]])
	);
	const order = sorted.map((bp) => bp.id);
	const at = (mode: TokenMode, bp: Breakpoint): Record<string, string> => {
		const vars = tokensToCssVars(tokens, { ...mode, breakpoint: bp.id }, order);
		// `light-dark()` follows color-scheme, so a light or dark theme sets it.
		return mode.theme === "light" || mode.theme === "dark"
			? { ...vars, "color-scheme": mode.theme }
			: vars;
	};
	const blocks = sorted.map(() => [] as string[]);
	for (const mode of allModes(dims)) {
		const isDefault = Object.entries(mode).every(([d, v]) => defaults[d] === v);
		const selector = modeSelector(root, mode, defaults);
		// What this mode's own rules have set so far; everything else comes
		// from the default mode's rules at the same breakpoint.
		const asserted: Record<string, string> = {};
		sorted.forEach((bp, index) => {
			const target = at(mode, bp);
			const fallback = isDefault
				? index > 0
					? at(mode, sorted[index - 1])
					: {}
				: at(defaults, bp);
			const emit: Record<string, string> = {};
			for (const [key, value] of Object.entries(target)) {
				const current = key in asserted ? asserted[key] : fallback[key];
				if (current !== value) emit[key] = value;
				if (!isDefault && (key in asserted || current !== value))
					asserted[key] = value;
			}
			blocks[index].push(rule(selector, emit));
		});
	}
	return blocks.map((rules, index) =>
		index === 0 ? rules.join("") : media(sorted[index].width, rules)
	);
};

/**
 * The page's stylesheet: tokens on the root, frame styles, then each layer's
 * styles at the smallest breakpoint and only what changes at each larger one.
 */
export const designCss = (
	doc: RenderableDocument,
	options: ExportOptions = {}
) => {
	const root = options.rootClass ?? ROOT;
	const defs = [...BUILT_IN_LAYERS, ...(options.layerTypes ?? [])];
	const sorted = sortBreakpointsByWidth(doc.breakpoints);
	const walked = walk(doc.layers, defs);
	const frame = doc.frameStyles ?? {};

	const base = [
		rule(`.${root}`, {
			...applyCssVars(frame),
			backgroundColor: frame["--background-color"] || "#ffffff",
			color: frame["--color"] || "#000000",
			minHeight: "100%",
		}),
	];
	const perBreakpoint = sorted.map(() => [] as string[]);
	for (const { layer, className, def } of walked) {
		const levels = cascade(layer, sorted).map((vars) => stylesAt(vars, def));
		levels.forEach((styles, index) => {
			const prev = index > 0 ? levels[index - 1] : { wrapper: {}, element: {} };
			const wrapper = changed(prev.wrapper, styles.wrapper);
			const element = changed(prev.element, styles.element);
			const target = index === 0 ? base : perBreakpoint[index];
			target.push(rule(`.${root} .${className}`, wrapper));
			target.push(rule(`.${root} .${className}>.e`, element));
		});
	}
	return [
		...tokenCss(doc, sorted, root),
		...base,
		...sorted.slice(1).map((bp, i) => media(bp.width, perBreakpoint[i + 1])),
	]
		.filter(Boolean)
		.join("\n");
};

const elementHtml = (
	{ layer, className, def }: Walked,
	inner: string
): string => {
	const content = def?.html?.content ?? "children";
	const tag = layer.elementType || def?.elementType || "div";
	const name = escapeHtml(layer.name);
	let element: string;
	if (content === "image")
		element = `<img class="e" src="${escapeHtml(layer.value)}" alt="${name}">`;
	else if (content === "input")
		element = `<input class="e" type="text" value="${escapeHtml(layer.value)}">`;
	else {
		const text = content === "text" ? escapeHtml(layer.value) : "";
		element = `<${tag} class="e">${text}${inner}</${tag}>`;
	}
	return `<div class="${className}">${element}</div>`;
};

/** The page's markup, the same structure the editor renders. */
export const designHtml = (
	doc: RenderableDocument,
	options: ExportOptions = {}
) => {
	const defs = [...BUILT_IN_LAYERS, ...(options.layerTypes ?? [])];
	const walked = walk(doc.layers, defs);
	const byLayer = new Map(walked.map((w) => [w.layer, w]));
	const render = (layers: Layer[]): string =>
		layers
			.map((layer) => {
				const w = byLayer.get(layer) as Walked;
				return elementHtml(w, render(layer.children ?? []));
			})
			.join("");
	return render(doc.layers);
};

/**
 * A design as HTML and CSS. `html` is the root element with the layers in
 * it; `css` styles it at every breakpoint. Set `data-<dimension>` attributes
 * on the root (like `data-theme="dark"`) to pick a token mode.
 */
export const exportHtml = (
	doc: RenderableDocument,
	options: ExportOptions = {}
) => {
	const root = options.rootClass ?? ROOT;
	return {
		html: `<div class="${root}">${designHtml(doc, options)}</div>`,
		css: designCss(doc, options),
	};
};

/** A complete, standalone page: open it in a browser and resize it. */
export const exportPage = (
	doc: RenderableDocument,
	options: ExportOptions & {
		title?: string;
		/** Extra markup for <head>, like the font links the design uses. */
		head?: string;
	} = {}
) => {
	const { html, css } = exportHtml(doc, options);
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(options.title ?? "Design")}</title>
${options.head ?? ""}
<style>
html,body{margin:0;height:100%}
${css}
</style>
</head>
<body>
${html}
</body>
</html>
`;
};
