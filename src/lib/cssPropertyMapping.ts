import type { CSSProperties } from "react";

/**
 * Map of CSS custom property names to their corresponding CSSProperties keys
 */
const CSS_VAR_TO_PROPERTY_MAP: Record<string, keyof CSSProperties> = {
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
 * Converts a cssVars object to a CSSProperties object
 * Optionally filters by supported properties
 */
export function applyCssVars(
	cssVars: Record<string, string> | undefined,
	supportedProperties?: SupportedCssProperty[]
): CSSProperties {
	if (!cssVars) return {};

	const style: CSSProperties = {};

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
			// Type assertion needed because CSSProperties has strict types per property,
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

	return style;
}

/**
 * Get the CSS property name from a CSS variable name
 */
export function getCssPropertyName(
	cssVar: string
): keyof CSSProperties | undefined {
	return CSS_VAR_TO_PROPERTY_MAP[cssVar];
}

/**
 * Check if a CSS variable is supported
 */
export function isSupportedCssVar(cssVar: string): boolean {
	return cssVar in CSS_VAR_TO_PROPERTY_MAP;
}
