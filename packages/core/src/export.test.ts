import { describe, expect, it } from "vitest";
import { designCss, designHtml, exportHtml, exportPage } from "./export";
import type { Token } from "./tokens";
import type { Breakpoint, Layer } from "./types";

const breakpoints: Breakpoint[] = [
	{
		id: "desktop",
		name: "Desktop",
		width: 1440,
		height: 900,
		position: { x: 900, y: 0 },
	},
	{
		id: "mobile",
		name: "Mobile",
		width: 375,
		height: 667,
		position: { x: 0, y: 0 },
	},
	{
		id: "tablet",
		name: "Tablet",
		width: 768,
		height: 1024,
		position: { x: 400, y: 0 },
	},
];

const title: Layer = {
	id: "title",
	name: "Title",
	type: "text",
	value: "Hi <there> & you",
	elementType: "h1",
	cssVars: { "--font-size": "24px", "--color": "red" },
	breakpointCssVars: {
		tablet: { "--font-size": "24px" },
		desktop: { "--font-size": "64px" },
	},
};

describe("designCss", () => {
	it("puts base styles first and only what changes in min-width queries, smallest first", () => {
		const css = designCss({ layers: [title], breakpoints });
		expect(css).toContain(".design .l0>.e{font-size:24px;color:red}");
		// Tablet repeats the base value, so it gets no block of its own.
		expect(css).not.toContain("min-width:768px");
		expect(css).toContain(
			"@media (min-width:1440px){.design .l0>.e{font-size:64px}}"
		);
	});

	it("puts width and height on the wrapper, like the editor", () => {
		const box: Layer = {
			id: "box",
			name: "Box",
			type: "frame",
			value: "",
			cssVars: {
				"--width": "200px",
				"--height": "100px",
				"--background-color": "blue",
			},
		};
		const css = designCss({ layers: [box], breakpoints });
		expect(css).toContain(".design .l0{width:200px;height:100px}");
		expect(css).toContain("background-color:blue");
	});

	it("applies frame styles to the root, with the editor's fallbacks", () => {
		const css = designCss({
			layers: [],
			breakpoints,
			frameStyles: { "--font-family": "Inter" },
		});
		expect(css).toContain(
			".design{font-family:Inter;background-color:#ffffff;color:#000000;min-height:100%}"
		);
	});

	it("keeps transitions, which the canvas leaves out while editing", () => {
		const moving: Layer = {
			...title,
			cssVars: { "--transition-duration": "200ms" },
			breakpointCssVars: {},
		};
		expect(designCss({ layers: [moving], breakpoints })).toContain("200ms");
	});

	it("only writes properties the layer type supports", () => {
		const img: Layer = {
			id: "pic",
			name: "Pic",
			type: "image",
			value: "a.png",
			cssVars: { "--font-size": "40px", "--border-radius": "8px" },
		};
		const css = designCss({ layers: [img], breakpoints });
		expect(css).toContain("border-radius:8px");
		expect(css).not.toContain("font-size:40px");
	});

	describe("tokens", () => {
		const tokens: Token[] = [
			{
				path: "color.bg",
				type: "color",
				tier: "semantic",
				value: "#fff",
				modes: [{ when: { theme: "dark" }, value: "#000" }],
			},
			{
				path: "space.page",
				type: "dimension",
				tier: "semantic",
				value: "16px",
				modes: [{ when: { breakpoint: "desktop" }, value: "64px" }],
			},
		];
		const css = designCss({
			layers: [],
			breakpoints,
			tokens,
			tokenDimensions: { theme: ["light", "dark"] },
		});

		it("puts default values on the root", () => {
			expect(css).toContain(
				".design{--color-bg:#fff;--space-page:16px;color-scheme:light}"
			);
		});

		it("turns token dimensions into attribute selectors with only what differs", () => {
			expect(css).toContain(
				'.design[data-theme="dark"]{--color-bg:#000;color-scheme:dark}'
			);
		});

		it("varies tokens by breakpoint inside media queries", () => {
			expect(css).toContain(
				"@media (min-width:1440px){.design{--space-page:64px}}"
			);
		});
	});
});

describe("designHtml", () => {
	it("escapes text and uses the layer's element", () => {
		expect(designHtml({ layers: [title], breakpoints })).toBe(
			'<div class="l0"><h1 class="e">Hi &lt;there&gt; &amp; you</h1></div>'
		);
	});

	it("renders every built-in layer type", () => {
		const layers: Layer[] = [
			{
				id: "f",
				name: "Frame",
				type: "frame",
				value: "",
				elementType: "section",
				children: [
					{ id: "t", name: "Text", type: "text", value: "Hello" },
					{ id: "i", name: 'A "pic"', type: "image", value: "a.png?x=1&y=2" },
					{ id: "n", name: "Field", type: "input", value: "typed" },
				],
			},
		];
		expect(designHtml({ layers, breakpoints })).toBe(
			'<div class="l0"><section class="e">' +
				'<div class="l1"><p class="e">Hello</p></div>' +
				'<div class="l2"><img class="e" src="a.png?x=1&amp;y=2" alt="A &quot;pic&quot;"></div>' +
				'<div class="l3"><input class="e" type="text" value="typed"></div>' +
				"</section></div>"
		);
	});

	it("exports an unknown layer type as a div holding its children", () => {
		const layers: Layer[] = [
			{ id: "x", name: "Badge", type: "badge", value: "" },
		];
		expect(designHtml({ layers, breakpoints })).toBe(
			'<div class="l0"><div class="e"></div></div>'
		);
	});
});

describe("exportHtml and exportPage", () => {
	it("wraps the layers in the root class every rule is scoped to", () => {
		const { html, css } = exportHtml(
			{ layers: [title], breakpoints },
			{ rootClass: "card" }
		);
		expect(html.startsWith('<div class="card">')).toBe(true);
		expect(css).toContain(".card .l0>.e");
	});

	it("builds a standalone page", () => {
		const page = exportPage(
			{ layers: [title], breakpoints },
			{ title: "A & B" }
		);
		expect(page).toContain("<!doctype html>");
		expect(page).toContain("<title>A &amp; B</title>");
		expect(page).toContain('<meta name="viewport"');
	});
});

describe("font width", () => {
	it("exports --font-stretch as font-stretch on text", () => {
		const css = designCss({
			layers: [
				{
					id: "h",
					name: "Headline",
					type: "text",
					value: "Condensed",
					cssVars: { "--font-stretch": "75%" },
				},
			],
			breakpoints: [breakpoints[1]],
		});
		expect(css).toContain("font-stretch:75%");
	});
});
