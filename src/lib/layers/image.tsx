import { IconPhoto } from "@tabler/icons-react";
import type { LayerType, LayerWithStyles } from "../Types";

export const imageLayerType = {
  type: "image",
  name: "Image",
  icon: <IconPhoto />,
  supportsChildren: false,
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
        width: layer.style.width,
        height: layer.style.height,
        display: "block",
      }}
    />
  ),
} satisfies LayerType;
