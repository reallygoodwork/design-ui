import { describe, expect, it } from "vitest";
import { applyCssVars, getCssPropertyName } from "./cssPropertyMapping";
import { frameLayerType } from "./layers/frame";
import { imageLayerType } from "./layers/image";
import { inputLayerType } from "./layers/input";
import { textLayerType } from "./layers/text";

const layerTypes = [
	frameLayerType,
	textLayerType,
	imageLayerType,
	inputLayerType,
];

describe("layout", () => {
	it.each(layerTypes.map((t) => [t.type, t] as const))(
		"every supported property of %s maps to a CSS property",
		(_name, layerType) => {
			const unmapped = (layerType.supportedCssProperties as string[]).filter(
				(p) => !getCssPropertyName(p)
			);
			expect(unmapped).toEqual([]);
		}
	);

	it("applyCssVars maps the six layout vars", () => {
		expect(
			applyCssVars({
				"--display": "flex",
				"--flex-direction": "column",
				"--align-items": "center",
				"--justify-content": "space-between",
				"--column-gap": "12px",
				"--row-gap": "8px",
			})
		).toEqual({
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "space-between",
			columnGap: "12px",
			rowGap: "8px",
		});
	});
});

describe("panel controls", () => {
	it("maps flex-wrap, grid templates, text-decoration parts and position", () => {
		expect(
			applyCssVars({
				"--flex-wrap": "wrap",
				"--grid-template-columns": "repeat(2, 1fr)",
				"--grid-template-rows": "repeat(3, 1fr)",
				"--text-decoration-line": "underline",
				"--text-decoration-color": "red",
				"--text-decoration-thickness": "2px",
				"--text-decoration-style": "wavy",
				position: "absolute",
				top: "4px",
			})
		).toEqual({
			flexWrap: "wrap",
			gridTemplateColumns: "repeat(2, 1fr)",
			gridTemplateRows: "repeat(3, 1fr)",
			textDecorationLine: "underline",
			textDecorationColor: "red",
			textDecorationThickness: "2px",
			textDecorationStyle: "wavy",
			position: "absolute",
			top: "4px",
		});
	});

	it("combines text-shadow parts into text-shadow", () => {
		expect(
			applyCssVars({
				"--text-shadow-offset-x": "2px",
				"--text-shadow-offset-y": "3px",
				"--text-shadow-blur-radius": "4px",
				"--text-shadow-color": "#f00",
			})
		).toEqual({ textShadow: "2px 3px 4px #f00" });
	});

	it("lets an explicit --text-shadow win, and respects supportedProperties", () => {
		expect(
			applyCssVars({
				"--text-shadow": "1px 1px red",
				"--text-shadow-color": "blue",
			})
		).toEqual({ textShadow: "1px 1px red" });
		expect(
			applyCssVars({ "--text-shadow-color": "blue" }, ["--color"])
		).toEqual({});
	});
});
