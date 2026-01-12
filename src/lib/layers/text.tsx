import { IconTypography } from "@tabler/icons-react";
import type { LayerType, LayerWithStyles } from "../Types";

export const textLayerType = {
  type: "text",
  name: "Text",
  icon: <IconTypography />,
  supportsChildren: true,
  defaultValues: {
    name: "Text",
    value: "Hello World",
    cssVars: {
      "--font-size": "16px",
      "--color": "#000000",
      "--font-family": "Arial",
      "--line-height": "1.5",
      "--letter-spacing": "0",
    },
  },
  render: (layer: LayerWithStyles, children?: React.ReactNode) => (
    <p style={{ fontSize: layer.cssVars?.["--font-size"], color: layer.cssVars?.["--color"], fontFamily: layer.cssVars?.["--font-family"], lineHeight: layer.cssVars?.["--line-height"], letterSpacing: layer.cssVars?.["--letter-spacing"] }}>
      {layer.name}
      {children}
    </p>
  ),
} satisfies LayerType;
