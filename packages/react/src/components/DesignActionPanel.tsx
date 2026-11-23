import {
	IconLayoutGrid,
	IconLock,
	IconPalette,
	IconSquare,
	IconTypography,
	IconWaveSine,
} from "@tabler/icons-react";
import { useState } from "react";
import { AllowedContext, useAllowed } from "../hooks/useAllowed";
import { useSelectedLayers } from "../hooks/useSelectedLayers";
import { ActionBackgroundColor } from "./actions/ActionBackgroundColor";
import { ActionBorder } from "./actions/ActionBorder";
import { ActionBorderRadius } from "./actions/ActionBorderRadius";
import { ActionColor } from "./actions/ActionColor";
import { ActionElementType } from "./actions/ActionElementType";
import { ActionFontFamily } from "./actions/ActionFontFamily";
import { ActionFontSize } from "./actions/ActionFontSize";
import { ActionFontWeight } from "./actions/ActionFontWeight";
import { ActionFontWidth } from "./actions/ActionFontWidth";
import { ActionImage } from "./actions/ActionImage";
import { ActionLayout } from "./actions/ActionLayout";
import { ActionLetterSpacing } from "./actions/ActionLetterSpacing";
import { ActionLineHeight } from "./actions/ActionLineHeight";
import { ActionOpacity } from "./actions/ActionOpacity";
import { ActionPosition } from "./actions/ActionPosition";
import { ActionTextAlign } from "./actions/ActionTextAlign";
import { ActionTextContent } from "./actions/ActionTextContent";
import { ActionTextDecoration } from "./actions/ActionTextDecoration";
import { ActionTextShadow } from "./actions/ActionTextShadow";
import { ActionTextStyle } from "./actions/ActionTextStyle";
import { ActionTextTransform } from "./actions/ActionTextTransform";
import { ActionTransition } from "./actions/ActionTransition";
import { BreakpointSwitcher } from "./BreakpointSwitcher";
import { DesignerPane } from "./DesignerPane";

export const DesignActionPanel = () => {
	const [layer] = useSelectedLayers();
	const [hoveredProperty, setHoveredProperty] = useState<string | null>(null);
	const limits = useAllowed(layer?.id);
	const limited =
		limits.editableProperties !== null ||
		!limits.content ||
		Object.keys(limits.values).length > 0;

	// Any row tagged with a property lights up its value in the switcher
	const trackProperty = (event: React.SyntheticEvent) => {
		const row = (event.target as Element).closest?.("[data-css-prop]");
		setHoveredProperty(row?.getAttribute("data-css-prop") ?? null);
	};

	if (!layer) {
		return (
			<p className="p-4 text-center text-muted-foreground text-control">
				Select a layer to edit its styles.
			</p>
		);
	}

	return (
		<AllowedContext.Provider value={limits}>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: only reports which row is pointed at */}
			<div
				data-slot="styles-panel"
				onMouseOver={trackProperty}
				onFocus={trackProperty}
				onMouseLeave={() => setHoveredProperty(null)}
			>
				<BreakpointSwitcher property={hoveredProperty} />
				{limited && (
					<p className="mx-3 mt-2 flex items-center gap-1.5 rounded-md bg-muted px-2 py-1.5 text-caption text-muted-foreground">
						<IconLock aria-hidden="true" className="size-3.5 shrink-0" />
						Editing rules limit what can change on {layer.name}.
					</p>
				)}
				<DesignerPane title="Layer" category="layer" icon={<IconSquare />}>
					<ActionPosition />
					<ActionOpacity />
					<ActionBorderRadius />
					<ActionTextContent />
					<ActionImage />
					<ActionElementType />
				</DesignerPane>
				<DesignerPane
					title="Layout"
					category="layout"
					icon={<IconLayoutGrid />}
				>
					<ActionLayout />
				</DesignerPane>
				<DesignerPane title="Color" category="color" icon={<IconPalette />}>
					<ActionBackgroundColor />
					<ActionColor />
					<ActionBorder />
				</DesignerPane>
				<DesignerPane
					title="Typography"
					category="type"
					icon={<IconTypography />}
					showForLayerTypes={["text"]}
				>
					<ActionFontFamily />
					<ActionFontWeight />
					<ActionFontWidth />
					<ActionFontSize />
					<ActionLineHeight />
					<ActionLetterSpacing />
					<ActionTextAlign />
					<ActionTextStyle />
					<ActionTextDecoration />
					<ActionTextTransform />
					<ActionTextShadow />
				</DesignerPane>
				<DesignerPane title="Motion" category="motion" icon={<IconWaveSine />}>
					<ActionTransition />
				</DesignerPane>
			</div>
		</AllowedContext.Provider>
	);
};
