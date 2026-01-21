import { IconTypography } from "@tabler/icons-react";
import { applyCssVars } from "../cssPropertyMapping";
import type { LayerType, LayerWithStyles } from "../Types";

export const textLayerType = {
	type: "text",
	name: "Text",
	icon: <IconTypography />,
	supportsChildren: true,
	supportedCssProperties: [
		"--font-size",
		"--font-family",
		"--font-weight",
		"--font-style",
		"--line-height",
		"--letter-spacing",
		"--text-align",
		"--text-decoration",
		"--text-transform",
		"--text-shadow",
		"--color",
		"--background-color",
		"--padding-block-start",
		"--padding-block-end",
		"--padding-inline-start",
		"--padding-inline-end",
		"--margin-block-start",
		"--margin-block-end",
		"--margin-inline-start",
		"--margin-inline-end",
		"--border-radius",
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
		name: "Text",
		value: "Hello World",
		cssVars: {
			"--font-size": "16px",
			"--color": "#000000",
			"--font-family": "Arial",
		},
	},
	render: (
		layer: LayerWithStyles,
		children?: React.ReactNode,
		elementType = "p"
	) => {
		const Element = elementType as keyof JSX.IntrinsicElements;
		return (
			<Element
				style={applyCssVars(
					layer.cssVars,
					textLayerType.supportedCssProperties
				)}
			>
				{layer.value}
				{children}
			</Element>
		);
	},
	elementType: "p",
	availableElementTypes: [
		"p",
		"span",
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6",
		"label",
	],
} satisfies LayerType;
