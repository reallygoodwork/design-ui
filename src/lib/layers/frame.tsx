import { frameLayer } from "@design-ui/core";
import { IconFrame } from "@tabler/icons-react";
import { applyCssVars } from "../cssPropertyMapping";
import type { LayerType, LayerWithStyles } from "../Types";

export const frameLayerType = {
	...frameLayer,
	icon: <IconFrame />,
	render: (
		layer: LayerWithStyles,
		children?: React.ReactNode,
		elementType = "div"
	) => {
		const Element = elementType as keyof JSX.IntrinsicElements;
		return (
			<Element
				style={applyCssVars(
					layer.effectiveCssVars,
					frameLayerType.supportedCssProperties
				)}
			>
				{children}
			</Element>
		);
	},
} satisfies LayerType;
