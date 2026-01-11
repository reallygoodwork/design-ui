import { IconFrame } from "@tabler/icons-react";
import type { LayerType, LayerWithStyles } from "../Types";

export const frameLayerType = {
  type: "frame",
  name: "Frame",
  icon: <IconFrame />,
  supportsChildren: true,
  defaultValues: {
    name: "Frame",
    value: "Hello World",
    cssVars: {
      "--font-size": "16px",
    },
  },
  render: (layer: LayerWithStyles, children?: React.ReactNode) => (
    <div style={{ width: layer.cssVars?.["--width"], height: layer.cssVars?.["--height"], backgroundColor: layer.cssVars?.["--background-color"] }}>
      {children}
    </div>
  ),
} satisfies LayerType;
