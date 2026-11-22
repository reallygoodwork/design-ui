import type { Rule } from "@design-ui/core";

// Pass these to <Designer rules={rules}>. Builders aren't limited by them;
// editors and every agent are. A design with no rules allows everything.
export const rules: Rule[] = [
	{
		// The page's layers can't be added, removed or reordered.
		id: "page-layout",
		target: { layerIds: ["page"] },
		structure: { locked: true },
	},
	{
		// The title keeps the design system's type; its words can change.
		id: "title-type",
		target: { layerIds: ["title"] },
		editableProperties: ["group:color"],
		message: "The title uses the design system's type. Its text can change.",
	},
	{
		// Every color comes from a token, so themes and brands stay intact.
		id: "brand-colors",
		target: {},
		values: { "group:color": { tokensOnly: true } },
	},
	{
		// Cards hold up to three text or image layers, and nothing else.
		id: "card-contents",
		target: { layerIds: ["card"] },
		structure: { allowedChildren: ["text", "image"], maxChildren: 3 },
	},
];
