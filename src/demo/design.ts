import {
	type Breakpoint,
	type Layer,
	type Rule,
	tokenCssValue,
} from "@design-ui/core";

/** The demo's design: one page shown at three widths. */
export const demoLayers: Layer[] = [
	{
		id: "page",
		type: "frame",
		name: "Page",
		value: "",
		cssVars: {
			"--display": "flex",
			"--flex-direction": "column",
			"--row-gap": tokenCssValue("space.stack"),
			"--padding-block-start": "40px",
			"--padding-block-end": "40px",
			"--padding-inline-start": tokenCssValue("space.page.inline"),
			"--padding-inline-end": tokenCssValue("space.page.inline"),
			"--background-color": tokenCssValue("color.bg.page"),
		},
		breakpointCssVars: {
			desktop: {
				"--padding-block-start": "96px",
			},
		},
		children: [
			{
				id: "title",
				type: "text",
				name: "Title",
				value: "Field notes from a small studio",
				elementType: "h1",
				cssVars: {
					"--font-size": "48px",
					"--line-height": "52px",
					"--font-weight": tokenCssValue("font.weight.heading"),
					"--color": tokenCssValue("color.text.primary"),
				},
				breakpointCssVars: {
					desktop: { "--font-size": "112px", "--line-height": "112px" },
				},
			},
			{
				id: "intro",
				type: "text",
				name: "Intro",
				value:
					"Select any layer, then change it in the panel on the right. Each frame shows the same layers at a different width.",
				cssVars: {
					"--font-size": "18px",
					"--line-height": "28px",
					"--color": "#52525b",
				},
				breakpointCssVars: {
					desktop: { "--font-size": "28px", "--line-height": "40px" },
				},
			},
			{
				id: "swatch",
				type: "frame",
				name: "Feature",
				value: "",
				cssVars: {
					"--height": "220px",
					"--background-color": tokenCssValue("color.action.primary"),
				},
				breakpointCssVars: { desktop: { "--height": "360px" } },
			},
		],
	},
];

// Define initial breakpoints (mobile-first: smallest to largest)
export const demoBreakpoints: Breakpoint[] = [
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
		position: { x: 425, y: 0 },
	},
	{
		id: "desktop",
		name: "Desktop",
		width: 1440,
		height: 900,
		position: { x: 1243, y: 0 },
	},
];

/**
 * What someone in the editor role may change in the demo: the page's layout
 * is fixed, the title's text can change but not its style, and colors come
 * from tokens.
 */
export const demoRules: Rule[] = [
	{
		id: "page-layout",
		target: { layerIds: ["page"] },
		structure: { locked: true },
	},
	{
		id: "title-style",
		target: { layerIds: ["title"] },
		editableProperties: [],
		message:
			"The title's style is set by the design system. Its text can change.",
	},
	{
		id: "brand-colors",
		target: {},
		values: { "group:color": { tokensOnly: true } },
	},
];
