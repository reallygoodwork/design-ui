import {
	type Color,
	formatHex,
	formatHex8,
	modeHsl,
	modeLrgb,
	modeOkhsv,
	modeOklab,
	modeOklch,
	modeP3,
	modeRgb,
	parse,
	useMode as registerMode,
} from "culori/fn";

// Registers the modes `parse` understands and returns a converter for each.
registerMode(modeHsl);
registerMode(modeLrgb);
registerMode(modeOklab);
const toRgb = registerMode(modeRgb);
const toOklch = registerMode(modeOklch);
const toOkhsv = registerMode(modeOkhsv);
const toP3 = registerMode(modeP3);

export const COLOR_FORMATS = [
	{ label: "Hex", value: "hex" },
	{ label: "OKLCH", value: "oklch" },
	{ label: "Display P3", value: "p3" },
] as const;

export type ColorFormat = (typeof COLOR_FORMATS)[number]["value"];

/**
 * Hue, saturation and value in OKHSV: the same hue as OKLCH, on axes that stay
 * inside sRGB, so every point on the picker's square is a real color.
 * Hue is 0-360, the rest 0-1.
 */
export type Hsva = { h: number; s: number; v: number; a: number };

const round = (value: number, decimals: number) =>
	Number((value ?? 0).toFixed(decimals));

/** The format a color string is written in, when it is one the tabs offer. */
export const detectFormat = (value: string | undefined): ColorFormat | null => {
	const text = value?.trim().toLowerCase() ?? "";
	if (text.startsWith("#")) return "hex";
	if (text.startsWith("oklch(")) return "oklch";
	if (text.startsWith("color(display-p3")) return "p3";
	return null;
};

const parseColor = (value: string | undefined): Color | undefined =>
	value?.trim() ? parse(value.trim()) : undefined;

export const isValidColor = (value: string) => Boolean(parseColor(value));

const withAlpha = (body: string, alpha: number) =>
	alpha < 1 ? `${body} / ${round(alpha, 3)}` : body;

const writeColor = (color: Color, format: ColorFormat): string => {
	const alpha = color.alpha ?? 1;
	if (format === "hex") {
		return alpha < 1 ? formatHex8(color) : formatHex(color);
	}
	if (format === "oklch") {
		const { l, c, h } = toOklch(color);
		return `oklch(${withAlpha(`${round(l, 3)} ${round(c, 4)} ${round(h ?? 0, 2)}`, alpha)})`;
	}
	const { r, g, b } = toP3(color);
	return `color(display-p3 ${withAlpha(`${round(r, 5)} ${round(g, 5)} ${round(b, 5)}`, alpha)})`;
};

/** Rewrite any CSS color in a format, or return null if it can't be read. */
export const formatColor = (
	value: string | undefined,
	format: ColorFormat
): string | null => {
	const color = parseColor(value);
	return color ? writeColor(color, format) : null;
};

export const parseToHsva = (value: string | undefined): Hsva | null => {
	const color = parseColor(value);
	if (!color) return null;
	const { h, s, v, alpha } = toOkhsv(color);
	return { h: h ?? 0, s: s ?? 0, v: v ?? 0, a: alpha ?? 1 };
};

const fromHsva = ({ h, s, v, a }: Hsva): Color => ({
	mode: "okhsv",
	h,
	s,
	v,
	alpha: a,
});

export const hsvaToString = (hsva: Hsva, format: ColorFormat) =>
	writeColor(fromHsva(hsva), format);

/** A hex color for painting swatches and slider tracks. */
export const hsvaToHex = (hsva: Omit<Hsva, "a">) =>
	formatHex(fromHsva({ ...hsva, a: 1 }));

/** 8-bit RGB for a canvas pixel. */
export const hsvToBytes = (h: number, s: number, v: number) => {
	const { r, g, b } = toRgb({ mode: "okhsv", h, s, v });
	const byte = (channel: number) =>
		Math.round(Math.min(1, Math.max(0, channel)) * 255);
	return [byte(r), byte(g), byte(b)] as const;
};
