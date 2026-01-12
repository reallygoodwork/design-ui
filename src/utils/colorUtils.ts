import { colord, extend } from "colord";
import namesPlugin from "colord/plugins/names";

extend([namesPlugin]);

export const colorFormats = [
  { label: "rgba", value: "rgba" },
  { label: "hsla", value: "hsla" },
  { label: "hex", value: "hex" },
] as const;

export type ColorFormat = (typeof colorFormats)[number]["value"];

/**
 * Converts a color string to the specified format
 */
export const convertColorToFormat = (
  color: string | undefined,
  format: ColorFormat,
  fallback: string = ""
): string => {
  if (!color) return fallback;

  const colorObj = colord(color);
  if (!colorObj.isValid()) return fallback;

  switch (format) {
    case "hex":
      return colorObj.toHex();
    case "rgba":
      return colorObj.toRgbString();
    case "hsla":
      return colorObj.toHslString();
    default:
      return fallback;
  }
};

/**
 * Validates if a color string matches the expected format
 */
export const validateColorFormat = (color: string, format: ColorFormat): boolean => {
  if (!color.trim()) return true; // Allow empty for clearing

  const colorObj = colord(color);
  if (!colorObj.isValid()) return false;

  switch (format) {
    case "hex":
      // Hex should match #RRGGBB or #RRGGBBAA pattern
      return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(
        color.trim()
      );
    case "rgba":
      // RGBA should match rgba(r, g, b, a) pattern
      return /^rgba?\(/.test(color.trim());
    case "hsla":
      // HSLA should match hsla(h, s%, l%, a) pattern
      return /^hsla?\(/.test(color.trim());
    default:
      return false;
  }
};
