import type React from "react";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { useLayers } from "../hooks/useLayers";
import type { Layer, LayerWithStyles } from "../lib/Types";

const DesignerLayer = ({
	layer,
	state,
}: {
	layer: Layer;
	state: ReturnType<typeof useDesignerContext>["state"];
}) => {
	const layerType = state.layerTypes.find((lt) => lt.type === layer.type);

	if (!layerType) {
		return null;
	}

	// Get the element type from layer, or fallback to layerType default
	const elementType = layer.elementType || layerType.elementType;

	// Determine if layer has explicit dimensions
	const hasWidth = layer.cssVars?.["--width"];
	const hasHeight = layer.cssVars?.["--height"];

	// Build styles for the wrapper div (what Moveable targets)
	const wrapperStyle: React.CSSProperties = {
		// position: "absolute",
		// transform: `translateX(${
		//   layer.cssVars?.["--translate-x"] || 0
		// }) translateY(${layer.cssVars?.["--translate-y"] || 0})`,
		// outline: isSelected ? "2px solid #3b82f6" : "none",
		// border: isSelected ? "2px solid #3b82f6" : "none",
	};

	// Only apply width/height if they're explicitly set
	// Otherwise, let the content determine the size (block elements will take full width)
	if (hasWidth) {
		wrapperStyle.width = hasWidth;
	}
	if (hasHeight) {
		wrapperStyle.height = hasHeight;
	}

	const layerWithStyles: LayerWithStyles = {
		...layer,
		style: {
			// Content styles - let the rendered content use its natural sizing
			// unless dimensions are explicitly set
			...(hasWidth && { width: hasWidth }),
			...(hasHeight && { height: hasHeight }),
		},
		contentStyle: {
			...layer.cssVars,
		},
	};

	// Render nested children first
	const children =
		layer.children && layer.children.length > 0 ? (
			<div>
				{layer.children.map((child) => (
					<DesignerLayer key={child.id} layer={child} state={state} />
				))}
			</div>
		) : undefined;

	return (
		<div
			className="designer-layer"
			data-layer-id={layer.id}
			key={layer.id}
			style={wrapperStyle}
		>
			{layerType.render(layerWithStyles, children, elementType)}
		</div>
	);
};

export const DesignerFrame = () => {
	const { state } = useDesignerContext();
	const layers = useLayers();

	return (
		<div
			data-slot="designer-frame"
			className="designer-frame relative bg-white"
			style={{
				width: state.frameSize?.width,
				height: state.frameSize?.height,
			}}
		>
			{layers.map((layer) => (
				<DesignerLayer key={layer.id} layer={layer} state={state} />
			))}
		</div>
	);
};
