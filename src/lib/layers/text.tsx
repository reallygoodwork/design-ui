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
		"--opacity",
		"--background-color",
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
	render: (layer: LayerWithStyles, children?: React.ReactNode) => (
		<p
			style={applyCssVars(layer.cssVars, textLayerType.supportedCssProperties)}
		>
			{layer.name}
			{children}
		</p>
	),
} satisfies LayerType;
