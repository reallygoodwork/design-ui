import type { Breakpoint, Layer } from "../lib/Types";

/**
 * Dev-only stress data, chosen with `?data=worst` or `?data=empty`.
 * Every value is something a real design could contain.
 */
export const worstCaseLayers: Layer[] = [
	{
		id: "page",
		type: "frame",
		name: "Spring campaign landing page (final v12, approved by legal)",
		value: "",
		cssVars: {
			"--display": "flex",
			"--flex-direction": "column",
			"--width": "calc(100% - 48px)",
			"--max-width": "1440px",
			"--min-height": "100vh",
			"--padding-block-start": "2.5rem",
			"--padding-inline-end": "12.75vw",
			"--padding-block-end": "128px",
			"--margin-block-start": "-24px",
			"--margin-inline-start": "auto",
			"--margin-inline-end": "auto",
			"--row-gap": "0.5rem",
			"--border-top-left-radius": "9999px",
			"--border-bottom-right-radius": "12.5%",
			"--background-color": "color(display-p3 0.98765 0.12345 0.45678 / 0.875)",
			"--border-color": "oklch(0.7123 0.1592 293.54 / 0.5)",
			"--border-width": "1.5px",
			"--transition-duration": "0.812s",
			"--transition-timing-function": "cubic-bezier(0.25, 0.1, 0.25, 1)",
		},
		breakpointCssVars: {
			tablet: { "--padding-block-start": "64px", "--flex-direction": "row" },
			desktop: { "--row-gap": "2.25em", "--display": "grid" },
		},
		children: [
			{
				id: "headline",
				type: "text",
				name: "Hero headline",
				elementType: "h1",
				value:
					"Żółć and Wiśniewska-Kowalczyk's quarterly fundraising summary for the Northwind Industries Holdings board of directors",
				cssVars: {
					"--font-size": "clamp(2rem, 5vw, 7.5rem)",
					"--font-family":
						"Playfair Display SC, Noto Serif Display, Georgia, serif",
					"--font-weight": "800",
					"--line-height": "1.05",
					"--letter-spacing": "-0.045em",
					"--color": "oklch(0.2134 0.0312 264.05)",
					"--text-decoration-line": "underline",
					"--text-decoration-color": "#ff0000",
					"--text-decoration-thickness": "0.125em",
					"--text-shadow-offset-x": "12.5px",
					"--text-shadow-offset-y": "-4px",
					"--text-shadow-blur-radius": "48px",
					"--text-shadow-color": "rgb(0 0 0 / 0.25)",
				},
			},
			{ id: "one", type: "text", name: "A", value: "" },
		],
	},
];

export const worstCaseBreakpoints: Breakpoint[] = [
	{
		id: "mobile",
		name: "Small phone",
		width: 320,
		height: 568,
		position: { x: 0, y: 0 },
	},
	{
		id: "tablet",
		name: "Tablet portrait",
		width: 768,
		height: 1024,
		position: { x: 370, y: 0 },
	},
	{
		id: "desktop",
		name: "Extra large desktop",
		width: 1920,
		height: 1080,
		position: { x: 1188, y: 0 },
	},
];
