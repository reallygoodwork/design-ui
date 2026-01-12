import type { ReactNode } from "react";
import { AddLayerDialog } from "./AddLayerDialog";
import { FontLoader } from "./FontLoader";
import { DesignerProvider } from "../context/DesignerContext";
import { useKeybindings } from "../hooks/useKeybindings";
import { frameLayerType } from "../lib/layers/frame";
import { imageLayerType } from "../lib/layers/image";
import { textLayerType } from "../lib/layers/text";
import type { Layer, LayerType } from "../lib/Types";

/**
 * Props for the `Designer` component.
 */
type DesignerProps = {
	/**
	 * The content of the designer.
	 */
	children: ReactNode;
	/**
	 * The initial layers for uncontrolled mode.
	 */
	defaultLayers?: Layer[];
	/**
	 * The current layers for controlled mode.
	 */
	layers?: Layer[];
	/**
	 * The layer types for the designer.
	 */
	layerTypes?: LayerType[];
	/**
	 * Callback for when the layers change in controlled mode.
	 */
	onLayersChange?: (layers: Layer[]) => void;
	/**
	 * The size of the frame.
	 */
	frameSize?: { width: number; height: number };
};

/**
 * The main container for the designer.
 */
export const Designer = ({
	children,
	defaultLayers,
	layers,
	onLayersChange,
	frameSize,
	layerTypes,
}: DesignerProps) => {
	useKeybindings();

	const allLayerTypes = [
		textLayerType,
		imageLayerType,
		frameLayerType,
		...(layerTypes || []),
	];
	return (
		<DesignerProvider
			defaultLayers={defaultLayers}
			layers={layers}
			onLayersChange={onLayersChange}
			frameSize={frameSize}
			defaultLayerTypes={allLayerTypes}
		>
			<FontLoader />
			<div
				data-slot="designer"
				className="ds group/ds relative flex h-full min-h-32 w-full flex-col"
			>
				<div
					data-slot="designer-inner"
					className="relative z-10 flex h-full w-full flex-1 flex-col bg-muted data-[mounted=true]:z-50"
				>
					{children}
				</div>
				<AddLayerDialog />
			</div>
		</DesignerProvider>
	);
};
