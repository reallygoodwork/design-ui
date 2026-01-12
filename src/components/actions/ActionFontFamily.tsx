import { IconZoom } from "@tabler/icons-react";
import { Command } from "cmdk";
import { useEffect, useMemo, useState } from "react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useGoogleFonts } from "../../hooks/useGoogleFonts";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ActionPopover } from "./ActionPopover";

interface GoogleFont {
	family: string;
  category: string;
  kind: string;
  subsets: string[];
  variants: string[];
  files: Record<string, string>;
}

let cachedFonts: GoogleFont[] | null = null;

const fallbackFonts = [
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
];

export const ActionFontFamily = () => {
	const selectedLayers = useSelectedLayers();
	const selectedLayer = selectedLayers[0];
	const designerAction = useDesignerAction();
	const { loadFont, preloadFont } = useGoogleFonts();
	const [fonts, setFonts] = useState<GoogleFont[]>(cachedFonts || []);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (!cachedFonts && !isLoading) {
			setIsLoading(true);
			fetch(
				`https://www.googleapis.com/webfonts/v1/webfonts?key=${import.meta.env.VITE_GOOGLE_API_KEY}&sort=popularity`
			)
				.then((response) => response.json())
				.then((data) => {
					cachedFonts = data.items.slice(0, 100);
					setFonts(cachedFonts || fallbackFonts.map((family) => ({ family, category: "sans-serif", kind: "normal", subsets: ["latin"], variants: ["400"], files: {} })));
				})
				.catch(() => {
					setFonts(fallbackFonts.map((family) => ({ family, category: "sans-serif", kind: "normal", subsets: ["latin"], variants: ["400"], files: {} })));
				})
				.finally(() => setIsLoading(false));
		}
	}, [isLoading]);

	const currentValue = selectedLayer?.cssVars?.["--font-family"] || "Arial";

	const triggerDisplayValue = useMemo(() => {
		return currentValue;
	}, [currentValue]);

	const handleSelect = (value: string) => {
		if (selectedLayer) {
			// Load the font before applying it
			loadFont(value);

			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: { id: selectedLayer.id, css: { "--font-family": value } },
			});
		}
	};

	const handleFontHover = (fontFamily: string) => {
		// Preload font on hover for better UX
		preloadFont(fontFamily);
	};

	return (
		<ActionPopover
			cssProperty={["--font-family"]}
			label="Font Family"
			popoverTitle="Font Family"
			triggerDisplayValue={triggerDisplayValue ?? ""}
		>
			<Command label="Font Family">
				<div
					data-slot="input-group"
					className="group/input-group relative flex w-full items-center [&:has([data-slot=addon]:first-child)_[data-slot=input]]:pl-6 [&:has([data-slot=addon]:last-child)_[data-slot=input]]:pr-6"
				>
					<div
						data-slot="addon"
						className="absolute inset-y-px isolate z-10 flex aspect-square items-center justify-center rounded-sm text-muted-foreground text-xs leading-tight first:left-px last:right-px [&_svg]:size-3 group-has-data-[slot=input-number-controls]/input-group:last:right-16"
					>
						<span className="inline-flex size-3 translate-y-[0.5px] text-center align-middle leading-none has-[svg]:translate-y-0">
							<IconZoom />
						</span>
					</div>
					<div className="relative flex items-center gap-1 w-full">
						<Command.Input
							className="flex h-7 w-full min-w-0 rounded-md border border-input bg-input pr-2 py-1 text-base outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 cursor-text pl-6"
							placeholder="Search fonts"
						/>
					</div>
				</div>
				<Command.List className="overflow-hidden text-foreground max-h-[300px] overflow-y-auto [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:text-xs">
					<Command.Empty>
						{isLoading ? "Loading fonts..." : "No results found."}
					</Command.Empty>

					{fonts.length > 0 && (
						<Command.Group heading="Google Fonts">
							{fonts.map((font) => (
								<Command.Item
									key={font.family}
									value={font.family}
									onSelect={handleSelect}
									onMouseEnter={() => handleFontHover(font.family)}
									className="relative select-none gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden data-[disabled=true]:pointer-events-none data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 flex cursor-pointer items-center pr-1 data-[selected=true]:bg-accent"
								>
									{font.family}
								</Command.Item>
							))}
						</Command.Group>
					)}
				</Command.List>
			</Command>
		</ActionPopover>
	);
};
