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
      "--height": "100px",
      "--background-color": "#ffffff",
      "--padding-block-start": "",
    },
  },
  render: (layer: LayerWithStyles, children?: React.ReactNode) => (
    <div
      style={{
        width: layer.cssVars?.["--width"],
        height: layer.cssVars?.["--height"],
        backgroundColor: layer.cssVars?.["--background-color"],
        paddingBlockStart: layer.cssVars?.["--padding-block-start"],
        paddingBlockEnd: layer.cssVars?.["--padding-block-end"],
        paddingInlineStart: layer.cssVars?.["--padding-inline-start"],
        paddingInlineEnd: layer.cssVars?.["--padding-inline-end"],
        marginBlockStart: layer.cssVars?.["--margin-block-start"],
        marginBlockEnd: layer.cssVars?.["--margin-block-end"],
        marginInlineStart: layer.cssVars?.["--margin-inline-start"],
        marginInlineEnd: layer.cssVars?.["--margin-inline-end"],
      }}
    >
      {children}
    </div>
  ),
} satisfies LayerType;
