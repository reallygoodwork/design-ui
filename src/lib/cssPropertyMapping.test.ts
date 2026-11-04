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
