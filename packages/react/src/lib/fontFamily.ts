const GENERIC_FAMILIES = new Set([
	"serif",
	"sans-serif",
	"monospace",
	"cursive",
	"fantasy",
	"system-ui",
	"math",
	"emoji",
	"fangsong",
	"inherit",
	"initial",
	"unset",
	"revert",
	"revert-layer",
]);

/**
 * Return the first family name of a CSS `font-family` value, with quotes and
 * surrounding whitespace stripped. Returns `null` when there is none or when
 * it is a CSS generic family or global keyword (which Google Fonts can't serve).
 */
export const primaryFontFamily = (
	value: string | undefined | null
): string | null => {
	if (!value) return null;
	const first = value
		.split(",")[0]
		.trim()
		.replace(/^["']+|["']+$/g, "")
		.trim();
	if (!first) return null;
	const lower = first.toLowerCase();
	if (GENERIC_FAMILIES.has(lower) || lower.startsWith("ui-")) return null;
	return first.replace(/\s+/g, " ");
};
