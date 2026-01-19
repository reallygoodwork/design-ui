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
		"--opacity",
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
				...applyCssVars(layer.cssVars, imageLayerType.supportedCssProperties),
			}}
		/>
	),
} satisfies LayerType;
