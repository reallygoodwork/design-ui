import { useEffect, useState } from "react";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { useGoogleFonts } from "../hooks/useGoogleFonts";
import { useLayers } from "../hooks/useLayers";
import { useTokens } from "../hooks/useTokens";
import { primaryFontFamily } from "../lib/fontFamily";
import type { Layer } from "../lib/Types";
import { aliasOf } from "../lib/tokens";

/**
 * Component that automatically loads Google Fonts for all layers in the canvas
 */
export const FontLoader = () => {
	const layers = useLayers();
	const { tokens } = useTokens();
	const { loadFont } = useGoogleFonts();
	const rawFrameFont =
		useDesignerContext().state.frameStyles?.["--font-family"];

	// The frame font is a free-text input that dispatches per keystroke, so
	// only load it once typing has paused.
	const [frameFont, setFrameFont] = useState(rawFrameFont);
	useEffect(() => {
		if (rawFrameFont === frameFont) return;
		const timer = setTimeout(() => setFrameFont(rawFrameFont), 400);
		return () => clearTimeout(timer);
	}, [rawFrameFont, frameFont]);

	useEffect(() => {
		// Extract all unique font families from layers
		const extractFonts = (layerList: Layer[]): Set<string> => {
			const fonts = new Set<string>();

			const traverse = (layer: Layer) => {
				const fontFamily = layer.cssVars?.["--font-family"];
				if (fontFamily) {
					fonts.add(fontFamily);
				}
				for (const overrides of Object.values(layer.breakpointCssVars ?? {})) {
					const bpFont = overrides?.["--font-family"];
					if (bpFont) {
						fonts.add(bpFont);
					}
				}
				layer.children?.forEach(traverse);
			};

			layerList.forEach(traverse);
			return fonts;
		};

		const fonts = extractFonts(layers);
		if (frameFont) {
			fonts.add(frameFont);
		}
		// A layer using a font token holds `var(--…)`: load the fonts tokens name.
		for (const token of tokens) {
			if (token.type !== "fontFamily") continue;
			for (const value of [
				token.value,
				...(token.modes ?? []).map((entry) => entry.value),
			]) {
				if (!aliasOf(value)) fonts.add(value);
			}
		}
		for (const font of fonts) {
			if (font.trim().startsWith("var(")) fonts.delete(font);
		}

		// Load all fonts
		const primaries = new Set<string>();
		fonts.forEach((font) => {
			const primary = primaryFontFamily(font);
			if (primary) primaries.add(primary);
		});
		primaries.forEach((font) => {
			loadFont(font);
		});
	}, [layers, frameFont, loadFont, tokens]);

	return null;
};
