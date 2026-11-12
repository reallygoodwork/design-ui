import { imageLayer } from "@design-ui/core";
import { IconPhoto } from "@tabler/icons-react";
import { applyCssVars } from "../cssPropertyMapping";
import type { LayerType, LayerWithStyles } from "../Types";

export const imageLayerType = {
	...imageLayer,
	icon: <IconPhoto />,
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
