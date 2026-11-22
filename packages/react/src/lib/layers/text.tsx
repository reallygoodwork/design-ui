import { textLayer } from "@design-ui/core";
import { IconTypography } from "@tabler/icons-react";
import { applyCssVars } from "../cssPropertyMapping";
import type { LayerType, LayerWithStyles } from "../Types";

export const textLayerType = {
	...textLayer,
	icon: <IconTypography />,
	render: (
		layer: LayerWithStyles,
		children?: React.ReactNode,
		elementType = "p"
	) => {
		const Element = elementType as keyof JSX.IntrinsicElements;
		return (
			<Element
				style={applyCssVars(
					layer.effectiveCssVars,
					textLayerType.supportedCssProperties
				)}
			>
				{layer.value}
				{children}
			</Element>
		);
	},
} satisfies LayerType;
