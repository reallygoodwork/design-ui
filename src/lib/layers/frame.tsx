import { IconFrame } from "@tabler/icons-react";
import { applyCssVars } from "../cssPropertyMapping";
import type { LayerType, LayerWithStyles } from "../Types";

export const frameLayerType = {
	type: "frame",
	name: "Frame",
	icon: <IconFrame />,
	supportsChildren: true,
	supportedCssProperties: [
		"--width",
		"--height",
		"--max-width",
		"--max-height",
		"--min-width",
		"--min-height",
		"--background-color",
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
		"--opacity",
		"--position",
		"--top",
		"--right",
		"--bottom",
		"--left",
		"--z-index",
		"--display",
		"--flex-direction",
		"--align-items",
		"--justify-content",
		"--column-gap",
		"--row-gap",
	],
	defaultValues: {
		name: "Frame",
		value: "Hello World",
		cssVars: {
			"--height": "100px",
			"--background-color": "#ffffff",
		},
	},
	render: (layer: LayerWithStyles, children?: React.ReactNode, elementType = "div") => {
		const Element = elementType as keyof JSX.IntrinsicElements;
		return (
			<Element
				style={applyCssVars(layer.cssVars, frameLayerType.supportedCssProperties)}
			>
				{children}
			</Element>
		);
	},
	elementType: "div",
	availableElementTypes: ["div", "section", "article", "main", "header", "footer", "nav", "aside"],
} satisfies LayerType;
