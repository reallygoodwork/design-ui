/**
 * Which tokens a property usually takes, read from token names: padding
 * wants spacing tokens before font sizes, corners want radius tokens. Only
 * the order changes; every token of the right type is still offered.
 */
const ROLES: { properties: RegExp; tokens: RegExp; label: string }[] = [
	{
		properties:
			/^--(padding|margin|row-gap|column-gap|gap|top|right|bottom|left|inset)/,
		tokens:
			/(^|[.-])(space|spacing|gap|gutter|inset|stack|padding|margin)([.-]|$)/i,
		label: "Spacing",
	},
	{
		properties: /radius$/,
		tokens: /(^|[.-])(radius|radii|rounded|corner)([.-]|$)/i,
		label: "Radius",
	},
	{
		properties: /^--font-size$/,
		tokens:
			/(font|text|type)[.-](size|scale)|(^|[.-])size[.-](display|body|heading|caption)/i,
		label: "Font sizes",
	},
	{
		properties: /^--line-height$/,
		tokens: /(^|[.-])(line[.-]?height|leading)([.-]|$)/i,
		label: "Line heights",
	},
	{
		properties: /^--letter-spacing$/,
		tokens: /(^|[.-])(letter[.-]?spacing|tracking)([.-]|$)/i,
		label: "Letter spacing",
	},
	{
		properties: /^--border-width$/,
		tokens: /(^|[.-])(border|stroke)([.-]|$)/i,
		label: "Border widths",
	},
	{
		properties: /^--(min-|max-)?(width|height)$/,
		tokens: /(^|[.-])(width|height|container|breakpoint)([.-]|$)/i,
		label: "Sizes",
	},
];

export type Suggestion = { label: string; matches: (path: string) => boolean };

/** What to list first for a property (or comma-separated properties), if anything. */
export function suggestionFor(cssProperty: string): Suggestion | null {
	const first = cssProperty.split(",")[0]?.trim() ?? "";
	const role = ROLES.find((r) => r.properties.test(first));
	return role
		? { label: role.label, matches: (path) => role.tokens.test(path) }
		: null;
}
