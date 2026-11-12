import type { Token, TokenDimensions } from "../lib/tokens";

/** Two brands and two themes. Breakpoint is a dimension too, set by each frame. */
export const demoTokenDimensions: TokenDimensions = {
	brand: ["coral", "harbor"],
	theme: ["light", "dark"],
};

const primitive = (
	path: string,
	type: Token["type"],
	value: string
): Token => ({
	path,
	type,
	tier: "primitive",
	value,
});

export const demoTokens: Token[] = [
	primitive("color.coral.500", "color", "#f2545b"),
	primitive("color.coral.700", "color", "#b4232c"),
	primitive("color.harbor.500", "color", "#2f7fd8"),
	primitive("color.harbor.700", "color", "#174e91"),
	primitive("color.neutral.0", "color", "#ffffff"),
	primitive("color.neutral.50", "color", "#f4f4f5"),
	primitive("color.neutral.100", "color", "#e4e4e7"),
	primitive("color.neutral.400", "color", "#a1a1aa"),
	primitive("color.neutral.600", "color", "#52525b"),
	primitive("color.neutral.800", "color", "#27272a"),
	primitive("color.neutral.900", "color", "#18181b"),
	primitive("color.neutral.950", "color", "#0c0c0e"),
	primitive("size.space.2", "dimension", "8px"),
	primitive("size.space.4", "dimension", "16px"),
	primitive("size.space.6", "dimension", "24px"),
	primitive("size.space.10", "dimension", "40px"),
	primitive("size.space.24", "dimension", "96px"),
	primitive("font.weight.regular", "fontWeight", "400"),
	primitive("font.weight.semibold", "fontWeight", "600"),
	primitive("font.weight.bold", "fontWeight", "700"),
	primitive("number.opacity.muted", "number", "0.6"),
	primitive("size.radius.md", "dimension", "8px"),
	primitive("size.radius.lg", "dimension", "16px"),
	primitive("font.family.sans", "fontFamily", "Inter, system-ui, sans-serif"),
	primitive(
		"font.family.serif",
		"fontFamily",
		"Georgia, 'Times New Roman', serif"
	),

	{
		path: "color.bg.page",
		type: "color",
		tier: "semantic",
		value: "{color.neutral.0}",
		modes: [{ when: { theme: "dark" }, value: "{color.neutral.950}" }],
		description: "Behind everything on the page.",
	},
	{
		path: "color.bg.surface",
		type: "color",
		tier: "semantic",
		value: "{color.neutral.50}",
		modes: [{ when: { theme: "dark" }, value: "{color.neutral.900}" }],
		description: "Cards and raised regions.",
	},
	{
		path: "color.text.primary",
		type: "color",
		tier: "semantic",
		value: "{color.neutral.900}",
		modes: [{ when: { theme: "dark" }, value: "{color.neutral.50}" }],
	},
	{
		path: "color.text.muted",
		type: "color",
		tier: "semantic",
		value: "{color.neutral.600}",
		modes: [{ when: { theme: "dark" }, value: "{color.neutral.400}" }],
	},
	{
		path: "color.border.subtle",
		type: "color",
		tier: "semantic",
		value: "{color.neutral.100}",
		modes: [{ when: { theme: "dark" }, value: "{color.neutral.800}" }],
	},
	{
		path: "color.action.primary",
		type: "color",
		tier: "semantic",
		value: "{color.coral.500}",
		modes: [{ when: { brand: "harbor" }, value: "{color.harbor.500}" }],
		description: "The one thing to press.",
	},
	{
		path: "color.action.strong",
		type: "color",
		tier: "semantic",
		value: "{color.coral.700}",
		modes: [{ when: { brand: "harbor" }, value: "{color.harbor.700}" }],
	},
	{
		path: "font.size.display",
		type: "dimension",
		tier: "semantic",
		value: "48px",
		modes: [{ when: { breakpoint: "desktop" }, value: "112px" }],
		description: "Page titles. Grows at desktop.",
	},
	{
		path: "font.size.body",
		type: "dimension",
		tier: "semantic",
		value: "18px",
		modes: [{ when: { breakpoint: "desktop" }, value: "28px" }],
	},
	{
		path: "font.family.display",
		type: "fontFamily",
		tier: "semantic",
		value: "{font.family.serif}",
	},
	{
		path: "font.family.body",
		type: "fontFamily",
		tier: "semantic",
		value: "{font.family.sans}",
	},

	{
		path: "space.page.inline",
		type: "dimension",
		tier: "semantic",
		value: "{size.space.6}",
		modes: [{ when: { breakpoint: "desktop" }, value: "{size.space.24}" }],
		description: "Space either side of the page. Wider at desktop.",
	},
	{
		path: "space.stack",
		type: "dimension",
		tier: "semantic",
		value: "{size.space.6}",
		modes: [{ when: { breakpoint: "desktop" }, value: "{size.space.10}" }],
		description: "Between blocks stacked on the page.",
	},
	{
		path: "font.weight.heading",
		type: "fontWeight",
		tier: "semantic",
		value: "{font.weight.semibold}",
	},
	{
		path: "color.bg.tint",
		type: "color",
		tier: "semantic",
		value: "color-mix(in oklch, {color.action.primary} 12%, {color.bg.page})",
		description:
			"A wash of the brand color. Composed, so it follows brand and theme.",
	},
	{
		path: "card.bg",
		type: "color",
		tier: "component",
		value: "{color.bg.surface}",
	},
	{
		path: "card.radius",
		type: "dimension",
		tier: "component",
		value: "{size.radius.lg}",
	},
	{
		path: "button.bg",
		type: "color",
		tier: "component",
		value: "{color.action.primary}",
	},
];
