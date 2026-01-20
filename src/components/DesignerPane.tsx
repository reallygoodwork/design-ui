import type { ReactNode } from "react";
import { useSelectedLayers } from "../hooks/useSelectedLayers";

export const DesignerPane = ({
	title,
	children,
	showForLayerTypes,
}: {
	title?: string;
	children: ReactNode;
	showForLayerTypes?: string[];
}) => {
	const selectedLayers = useSelectedLayers();

	if (
		showForLayerTypes &&
		!selectedLayers.some((layer) => showForLayerTypes.includes(layer.type))
	) {
		return null;
	}

	return (
		<div
			className="group flex flex-col gap-2 border-b border-border py-4 last:border-b-0 has-data-[slot=designer-pane-header]:gap-4"
			data-slot="designer-pane"
		>
			{title && (
				<h3
					className="flex h-7 items-center px-4 font-medium text-xs"
					data-slot="designer-pane-title"
				>
					{title}
				</h3>
			)}
			<div data-slot="designer-pane-content" className="grid gap-3 px-4">
				{children}
			</div>
		</div>
	);
};
