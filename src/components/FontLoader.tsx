import { useEffect } from "react";
import { useGoogleFonts } from "../hooks/useGoogleFonts";
import { useLayers } from "../hooks/useLayers";
import type { Layer } from "../lib/Types";

/**
 * Component that automatically loads Google Fonts for all layers in the canvas
 */
export const FontLoader = () => {
	const layers = useLayers();
	const { loadFont } = useGoogleFonts();

	useEffect(() => {
		// Extract all unique font families from layers
		const extractFonts = (layerList: Layer[]): Set<string> => {
			const fonts = new Set<string>();

			const traverse = (layer: Layer) => {
				const fontFamily = layer.cssVars?.["--font-family"];
				if (fontFamily) {
					fonts.add(fontFamily);
				}
				layer.children?.forEach(traverse);
			};

			layerList.forEach(traverse);
			return fonts;
		};

		const fonts = extractFonts(layers);

		// Load all fonts
		fonts.forEach((font) => {
			loadFont(font);
		});
	}, [layers, loadFont]);

	return null;
};
