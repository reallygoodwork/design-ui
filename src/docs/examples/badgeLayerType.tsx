import type { LayerType, LayerWithStyles } from "@design-ui/react";
import { applyCssVars } from "@design-ui/react";
import { IconTag } from "@tabler/icons-react";

export const badgeLayerType = {
	type: "badge",
	name: "Badge",
	icon: <IconTag />,
	supportsChildren: false,
	// The styles this layer accepts. Anything else is ignored when rendering.
	supportedCssProperties: ["--background-color", "--color", "--font-size"],
	defaultValues: {
		name: "Badge",
		value: "New",
		cssVars: { "--background-color": "#155dfc", "--color": "#ffffff" },
	},
	render: (layer: LayerWithStyles) => (
		<span
			style={{
				display: "inline-block",
				padding: "4px 12px",
				borderRadius: 999,
				...applyCssVars(
					layer.effectiveCssVars,
					badgeLayerType.supportedCssProperties
				),
			}}
		>
			{layer.value}
		</span>
	),
} satisfies LayerType;
