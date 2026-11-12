import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export type Category =
	| "layer"
	| "layout"
	| "color"
	| "type"
	| "motion"
	| "image";

// Literal class names, so Tailwind sees every one. The icon sits on a 14%
// tint of its own hue; each pair measures at least 4.6:1 in both themes.
const TONES: Record<Category, string> = {
	layer: "bg-cat-layer/14 text-cat-layer",
	layout: "bg-cat-layout/14 text-cat-layout",
	color: "bg-cat-color/14 text-cat-color",
	type: "bg-cat-type/14 text-cat-type",
	motion: "bg-cat-motion/14 text-cat-motion",
	image: "bg-cat-image/14 text-cat-image",
};

/** A small icon in its category's color. Decorative: the label sits beside it. */
export const CategoryChip = ({
	category,
	size = "md",
	children,
}: {
	category: Category;
	size?: "sm" | "md";
	children: ReactNode;
}) => (
	<span
		aria-hidden="true"
		className={cn(
			"grid shrink-0 place-items-center",
			size === "md"
				? "size-5 rounded-md [&_svg]:size-3.5"
				: "size-4 rounded-[5px] [&_svg]:size-3",
			TONES[category]
		)}
	>
		{children}
	</span>
);
