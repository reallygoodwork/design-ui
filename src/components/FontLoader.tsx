import { useEffect } from "react";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { useGoogleFonts } from "../hooks/useGoogleFonts";
import { useLayers } from "../hooks/useLayers";
import type { Layer } from "../lib/Types";

/**
 * Component that automatically loads Google Fonts for all layers in the canvas
 */
export const FontLoader = () => {
	const layers = useLayers();
	const { loadFont } = useGoogleFonts();
	const frameFont = useDesignerContext().state.frameStyles?.["--font-family"];

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

		// Load all fonts
		fonts.forEach((font) => {
			loadFont(font);
		});
	}, [layers, frameFont, loadFont]);

	return null;
};
