import { useCallback, useEffect, useRef } from "react";

const loadedFonts = new Set<string>();
const fontLinkElements = new Map<string, HTMLLinkElement>();

interface UseGoogleFontsOptions {
	weights?: number[];
	display?: "auto" | "block" | "swap" | "fallback" | "optional";
}

/**
 * Hook to dynamically load Google Fonts
 */
export const useGoogleFonts = () => {
	const loadFont = useCallback(
		(fontFamily: string, options?: UseGoogleFontsOptions) => {
			const { weights = [400, 500, 600, 700], display = "swap" } =
				options || {};

			// Already loaded
			if (loadedFonts.has(fontFamily)) {
				return;
			}

			// Format font family for URL (replace spaces with +)
			const formattedFamily = fontFamily.replace(/\s+/g, "+");

			// Build weights string
			const weightsString =
				weights.length > 0 ? `:wght@${weights.join(";")}` : "";

			// Create Google Fonts URL
			const fontUrl = `https://fonts.googleapis.com/css2?family=${formattedFamily}${weightsString}&display=${display}`;

			// Create and append link element
			const link = document.createElement("link");
			link.rel = "stylesheet";
			link.href = fontUrl;
			link.crossOrigin = "anonymous";

			document.head.appendChild(link);

			// Track loaded font
			loadedFonts.add(fontFamily);
			fontLinkElements.set(fontFamily, link);
		},
		[]
	);

	const unloadFont = useCallback((fontFamily: string) => {
		const linkElement = fontLinkElements.get(fontFamily);
		if (linkElement?.parentNode) {
			linkElement.parentNode.removeChild(linkElement);
			fontLinkElements.delete(fontFamily);
			loadedFonts.delete(fontFamily);
		}
	}, []);

	const preloadFont = useCallback((fontFamily: string) => {
		// Preload without adding to loaded set - useful for hover states
		const formattedFamily = fontFamily.replace(/\s+/g, "+");
		const fontUrl = `https://fonts.googleapis.com/css2?family=${formattedFamily}:wght@400;700&display=swap`;

		const existingPreload = document.querySelector(
			`link[rel="preload"][href="${fontUrl}"]`
		);

		if (!existingPreload) {
			const preload = document.createElement("link");
			preload.rel = "preload";
			preload.as = "style";
			preload.href = fontUrl;
			document.head.appendChild(preload);
		}
	}, []);

	const isLoaded = useCallback((fontFamily: string) => {
		return loadedFonts.has(fontFamily);
	}, []);

	return { loadFont, unloadFont, preloadFont, isLoaded };
};

/**
 * Hook to auto-load a font when a component mounts
 */
export const useLoadFont = (
	fontFamily: string | undefined,
	options?: UseGoogleFontsOptions
) => {
	const { loadFont } = useGoogleFonts();
	const previousFont = useRef<string>();

	useEffect(() => {
		if (!fontFamily) return;

		// Skip system fonts
		const systemFonts = [
			"Arial",
			"Helvetica",
			"Georgia",
			"Times New Roman",
			"Courier New",
			"Verdana",
			"Tahoma",
			"Trebuchet MS",
			"Impact",
			"Comic Sans MS",
			"serif",
			"sans-serif",
			"monospace",
		];

		if (systemFonts.includes(fontFamily)) {
			return;
		}

		// Load new font
		loadFont(fontFamily, options);
		previousFont.current = fontFamily;
	}, [fontFamily, loadFont, options]);
};
