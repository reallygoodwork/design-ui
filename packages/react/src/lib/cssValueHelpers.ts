/**
 * Parses a CSS value string into numeric value and unit
 * @param cssValue - CSS value string (e.g., "16px", "50%", "2rem")
 * @param defaultUnit - Default unit to use if none is found (default: "px")
 * @returns Object with numeric value and unit string
 * @example
 * parseCSSValue("16px", "px") // { value: 16, unit: "px" }
 * parseCSSValue("50%", "px") // { value: 50, unit: "%" }
 * parseCSSValue("", "px") // { value: 0, unit: "px" }
 */
export const parseCSSValue = (
	cssValue: string | undefined,
	defaultUnit = "px"
): { value: number; unit: string } => {
	if (!cssValue) return { value: 0, unit: defaultUnit };

	// Match number (including decimals and negatives) and unit
	const match = cssValue.match(/^(-?\d+\.?\d*)(.*)$/);
	if (!match) return { value: 0, unit: defaultUnit };

	const value = parseFloat(match[1]);
	const unit = match[2].trim() || defaultUnit;

	return {
		value: Number.isNaN(value) ? 0 : value,
		unit: unit || defaultUnit,
	};
};

/**
 * Extracts just the numeric value from a CSS variable string
 * Useful for simple numeric inputs that don't need unit handling
 * @param cssVar - CSS variable value (e.g., "16px", "50%")
 * @returns Numeric string or empty string if no value
 * @example
 * getNumericValue("16px") // "16"
 * getNumericValue("50%") // "50"
 * getNumericValue("") // ""
 */
export const getNumericValue = (cssVar: string | undefined): string => {
	if (!cssVar) return "";
	const parsed = parseCSSValue(cssVar);
	return parsed.value === 0 && !cssVar ? "" : parsed.value.toString();
};

/**
 * Formats a numeric value with a unit into a CSS value string
 * @param value - Numeric value or string
 * @param unit - CSS unit (px, %, rem, etc.)
 * @returns Formatted CSS value string or empty string
 * @example
 * formatCSSValue(16, "px") // "16px"
 * formatCSSValue("50", "%") // "50%"
 * formatCSSValue("", "px") // ""
 */
export const formatCSSValue = (
	value: number | string,
	unit: string
): string => {
	if (value === "" || value === null || value === undefined) return "";
	return `${value}${unit}`;
};
