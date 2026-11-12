/** Inline style properties, camelCased, as a framework's style prop takes them. */
export type CssStyle = Record<string, string | number>;

/**
 * Map of CSS custom property names to their corresponding CssStyle keys
 */
const CSS_VAR_TO_PROPERTY_MAP: Record<string, string> = {
	// Typography
	"--font-size": "fontSize",
	"--font-family": "fontFamily",
	"--font-weight": "fontWeight",
	"--font-style": "fontStyle",
	"--line-height": "lineHeight",
	"--letter-spacing": "letterSpacing",
	"--text-align": "textAlign",
	"--text-decoration": "textDecoration",
	"--text-transform": "textTransform",
	"--text-shadow": "textShadow",
	// Text decoration parts are real longhands, written one by one by the
	// Decoration popover.
	"--text-decoration-line": "textDecorationLine",
	"--text-decoration-color": "textDecorationColor",
	"--text-decoration-thickness": "textDecorationThickness",
	"--text-decoration-style": "textDecorationStyle",
	"--color": "color",

	// Layout
	"--width": "width",
	"--height": "height",
	"--max-width": "maxWidth",
	"--max-height": "maxHeight",
	"--min-width": "minWidth",
	"--min-height": "minHeight",
	"--display": "display",
	"--flex-direction": "flexDirection",
	"--flex-wrap": "flexWrap",
	"--grid-template-columns": "gridTemplateColumns",
	"--grid-template-rows": "gridTemplateRows",
	"--align-items": "alignItems",
	"--justify-content": "justifyContent",
	"--column-gap": "columnGap",
	"--row-gap": "rowGap",

	// Spacing
	"--padding-block-start": "paddingBlockStart",
	"--padding-block-end": "paddingBlockEnd",
	"--padding-inline-start": "paddingInlineStart",
	"--padding-inline-end": "paddingInlineEnd",
	"--margin-block-start": "marginBlockStart",
	"--margin-block-end": "marginBlockEnd",
	"--margin-inline-start": "marginInlineStart",
	"--margin-inline-end": "marginInlineEnd",

	// Appearance
	"--background-color": "backgroundColor",
	"--border-radius": "borderRadius",
	"--border-top-left-radius": "borderTopLeftRadius",
	"--border-top-right-radius": "borderTopRightRadius",
	"--border-bottom-left-radius": "borderBottomLeftRadius",
	"--border-bottom-right-radius": "borderBottomRightRadius",
	"--border-width": "borderWidth",
	"--border-style": "borderStyle",
	"--border-color": "borderColor",
	"--opacity": "opacity",

	// Position
	"--position": "position",
	"--top": "top",
	"--right": "right",
	"--bottom": "bottom",
	"--left": "left",
	"--z-index": "zIndex",

	// Motion
	"--transition-duration": "transitionDuration",
	"--transition-timing-function": "transitionTimingFunction",

	// ActionPosition writes these without the "--" prefix
	position: "position",
	top: "top",
	right: "right",
	bottom: "bottom",
	left: "left",
};

/**
 * Internal panel vars that are never rendered directly. `applyCssVars`
 * combines them into `text-shadow`; an explicit `--text-shadow` wins. Unset
 * offsets and blur default to 0px and the colour to currentcolor.
 */
const TEXT_SHADOW_PARTS = [
	"--text-shadow-offset-x",
	"--text-shadow-offset-y",
	"--text-shadow-blur-radius",
	"--text-shadow-color",
] as const;

/**
 * Supported CSS property names that can be used in layer definitions
 */
export type SupportedCssProperty = keyof typeof CSS_VAR_TO_PROPERTY_MAP;

/** Combine the Shadow popover's parts into one text-shadow value. */
function combineTextShadow(
	cssVars: Record<string, string>
): string | undefined {
	if (!TEXT_SHADOW_PARTS.some((part) => cssVars[part])) return undefined;
	const [x, y, blur, color] = TEXT_SHADOW_PARTS.map((part) => cssVars[part]);
	return `${x || "0px"} ${y || "0px"} ${blur || "0px"} ${color || "currentcolor"}`;
}

/**
 * A border width alone must be visible, and must not rely on a global
 * preflight (`border: 0 solid`), so default the style to solid at render
 * time. Nothing is stored: clearing the width leaves no stray style, and an
 * explicit --border-style always wins.
 */
function defaultBorderStyle(
	cssVars: Record<string, string>,
	style: CssStyle,
	supportedProperties?: SupportedCssProperty[]
): "solid" | undefined {
	if (!cssVars["--border-width"] || style.borderStyle) return undefined;
	if (supportedProperties && !supportedProperties.includes("--border-style"))
		return undefined;
	return "solid";
}

/**
 * Converts a cssVars object to a CssStyle object
 * Optionally filters by supported properties
 */
export function applyCssVars(
	cssVars: Record<string, string> | undefined,
	supportedProperties?: SupportedCssProperty[]
): CssStyle {
	if (!cssVars) return {};

	const style: CssStyle = {};

	for (const [cssVar, value] of Object.entries(cssVars)) {
		// Skip if value is empty/falsy
		if (!value) continue;

		// Skip if property not supported by this layer type
		if (
			supportedProperties &&
			!supportedProperties.includes(cssVar as SupportedCssProperty)
		) {
			continue;
		}

		const propertyKey = CSS_VAR_TO_PROPERTY_MAP[cssVar];
		if (propertyKey) {
			// Type assertion needed because CssStyle has strict types per property,
			// but CSS custom properties can contain any string value
			(style as Record<string, string>)[propertyKey] = value;
		}
	}

	const shadow = style.textShadow ? undefined : combineTextShadow(cssVars);
	if (
		shadow &&
		(!supportedProperties || supportedProperties.includes("--text-shadow"))
	) {
		style.textShadow = shadow;
	}

	const borderStyle = defaultBorderStyle(cssVars, style, supportedProperties);
	if (borderStyle) style.borderStyle = borderStyle;

	return style;
}

/**
 * A layer's transition is for the finished page. On the canvas it would make
 * every edit lag behind the control.
 */
export function withoutTransitions(
	cssVars: Record<string, string>
): Record<string, string> {
	return Object.fromEntries(
		Object.entries(cssVars).filter(([key]) => !key.startsWith("--transition-"))
	);
}

/**
 * Get the CSS property name from a CSS variable name
 */
export function getCssPropertyName(cssVar: string): string | undefined {
	return CSS_VAR_TO_PROPERTY_MAP[cssVar];
}

/**
 * Check if a CSS variable is supported
 */
export function isSupportedCssVar(cssVar: string): boolean {
	return cssVar in CSS_VAR_TO_PROPERTY_MAP;
}
