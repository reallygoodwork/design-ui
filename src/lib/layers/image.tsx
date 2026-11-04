import { IconPhoto } from "@tabler/icons-react";
import { applyCssVars } from "../cssPropertyMapping";
import type { LayerType, LayerWithStyles } from "../Types";

export const imageLayerType = {
	type: "image",
	name: "Image",
	icon: <IconPhoto />,
	supportsChildren: false,
	supportedCssProperties: [
		"--width",
		"--height",
		"--max-width",
		"--max-height",
		"--min-width",
		"--min-height",
		"--border-radius",
		"--border-top-left-radius",
		"--border-top-right-radius",
		"--border-bottom-left-radius",
		"--border-bottom-right-radius",
		"--border-width",
		"--border-style",
		"--border-color",
		"--background-color",
		"--color",
		"--padding-block-start",
		"--padding-block-end",
		"--padding-inline-start",
		"--padding-inline-end",
		"--display",
		"--flex-direction",
		"--flex-wrap",
		"--align-items",
		"--justify-content",
		"--column-gap",
		"--row-gap",
		"--grid-template-columns",
		"--grid-template-rows",
		"--opacity",
		"position",
		"top",
		"right",
		"bottom",
		"left",
		"--margin-block-start",
		"--margin-block-end",
		"--margin-inline-start",
		"--margin-inline-end",
	],
	defaultValues: {
		name: "Image",
		value: "https://placehold.co/150",
		cssVars: {
			"--width": "150px",
			"--height": "150px",
		},
	},
	render: (layer: LayerWithStyles, _children?: React.ReactNode) => (
		<img
			src={layer.value}
			alt={layer.name}
			style={{
				display: "block",
				...applyCssVars(
					layer.effectiveCssVars,
					imageLayerType.supportedCssProperties
				),
			}}
		/>
	),
} satisfies LayerType;
