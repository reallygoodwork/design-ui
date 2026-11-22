import type { ReactNode } from "react";
import { useSelectedLayers } from "../hooks/useSelectedLayers";
import { cn } from "../lib/cn";
import { type Category, CategoryChip } from "./common/CategoryChip";

/**
 * A group of controls. With a title it becomes a card on the panel, headed by
 * its name and, when given, a category icon. Without one it stays flat.
 */
export const DesignerPane = ({
	title,
	icon,
	category = "layer",
	children,
	showForLayerTypes,
}: {
	title?: string;
	/** Shown in a chip tinted with the pane's category color. */
	icon?: ReactNode;
	category?: Category;
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
		<section
			aria-label={title}
			className={cn(
				"group flex flex-col",
				title
					? "mx-1.5 mt-1.5 gap-2 rounded-lg border border-border bg-card pt-2 pb-3 shadow-xs last:mb-1.5"
					: "gap-2 py-4"
			)}
			data-slot="designer-pane"
		>
			{title && (
				<h3
					className="flex h-6 items-center gap-2 px-2 text-title"
					data-slot="designer-pane-title"
				>
					{icon && <CategoryChip category={category}>{icon}</CategoryChip>}
					{title}
				</h3>
			)}
			<div
				data-slot="designer-pane-content"
				className={cn("grid grid-cols-1 gap-1", title ? "px-2" : "px-4")}
			>
				{children}
			</div>
		</section>
	);
};
