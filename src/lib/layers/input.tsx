import { inputLayer } from "@design-ui/core";
import { IconForms } from "@tabler/icons-react";
import { applyCssVars } from "../cssPropertyMapping";
import type { LayerType, LayerWithStyles } from "../Types";

export const inputLayerType = {
	...inputLayer,
	icon: <IconForms />,
	render: (layer: LayerWithStyles, _children?: React.ReactNode) => (
		<input
			type="text"
			value={layer.value}
			style={applyCssVars(
				layer.effectiveCssVars,
				inputLayerType.supportedCssProperties
			)}
		/>
	),
} satisfies LayerType;
