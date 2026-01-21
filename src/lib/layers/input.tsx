import { IconForms } from "@tabler/icons-react";
import { applyCssVars } from "../cssPropertyMapping";
import type { LayerType, LayerWithStyles } from "../Types";

export const inputLayerType = {
	type: "input",
	name: "Input",
	icon: <IconForms />,
	supportsChildren: false,
	supportedCssProperties: [
		"--width",
		"--height",
		"--max-width",
		"--max-height",
		"--min-width",
		"--min-height",
		"--border-radius",
		"--opacity",
    "--display",
		"--flex-direction",
		"--align-items",
		"--justify-content",
		"--column-gap",
		"--row-gap",
    "--padding-block-start",
		"--padding-block-end",
		"--padding-inline-start",
		"--padding-inline-end",
		"--margin-block-start",
		"--margin-block-end",
		"--margin-inline-start",
		"--margin-inline-end",
		"--border-top-left-radius",
		"--border-top-right-radius",
		"--border-bottom-left-radius",
		"--border-bottom-right-radius",
		"--border-width",
		"--border-style",
		"--border-color",
	],
	defaultValues: {
		name: "Input",
		value: "hello",
		cssVars: {
			"--height": "100px",
		},
	},
	render: (layer: LayerWithStyles, _children?: React.ReactNode) => (
		<input type="text" value={layer.value} style={applyCssVars(layer.cssVars, inputLayerType.supportedCssProperties)} />
	),
  elementType: "input",
	availableElementTypes: ["input", "textarea", "select"],
} satisfies LayerType;
