import { extendTailwindMerge } from "tailwind-merge";

// The theme's named sizes and value style. Without this, tailwind-merge reads
// `text-caption` as a color and drops it when a later `text-muted-foreground`
// arrives, so the text silently falls back to the inherited size.
const twMerge = extendTailwindMerge({
	extend: {
		classGroups: {
			"font-size": [
				{ text: ["caption", "control", "value", "title", "heading"] },
			],
		},
	},
});

export const cn = (...classes: (string | undefined | false | null)[]) => {
	return twMerge(classes.filter(Boolean).join(" ").trim());
};
