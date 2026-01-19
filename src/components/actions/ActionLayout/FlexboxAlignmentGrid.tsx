import { Button } from "@base-ui/react/button";
import { useDesignerAction } from "../../../hooks/useDesignerAction";
import type { Layer } from "../../../lib/Types";
import { ClearButton } from "../../common/ClearButton";
import { DesignAction } from "../../DesignAction";

interface FlexboxAlignmentGridProps {
	selectedLayer: Layer | undefined;
	hasValue: boolean;
	onClear: () => void;
}

type AlignmentPosition = {
	justifyContent: string;
	alignItems: string;
	label: string;
	ariaLabel: string;
};

const alignmentPositions: AlignmentPosition[] = [
	{
		justifyContent: "flex-start",
		alignItems: "flex-start",
		label: "TL",
		ariaLabel: "Align top left",
	},
	{
		justifyContent: "center",
		alignItems: "flex-start",
		label: "TC",
		ariaLabel: "Align top center",
	},
	{
		justifyContent: "flex-end",
		alignItems: "flex-start",
		label: "TR",
		ariaLabel: "Align top right",
	},
	{
		justifyContent: "flex-start",
		alignItems: "center",
		label: "ML",
		ariaLabel: "Align middle left",
	},
	{
		justifyContent: "center",
		alignItems: "center",
		label: "MC",
		ariaLabel: "Align middle center",
	},
	{
		justifyContent: "flex-end",
		alignItems: "center",
		label: "MR",
		ariaLabel: "Align middle right",
	},
	{
		justifyContent: "flex-start",
		alignItems: "flex-end",
		label: "BL",
		ariaLabel: "Align bottom left",
	},
	{
		justifyContent: "center",
		alignItems: "flex-end",
		label: "BC",
		ariaLabel: "Align bottom center",
	},
	{
		justifyContent: "flex-end",
		alignItems: "flex-end",
		label: "BR",
		ariaLabel: "Align bottom right",
	},
];

export const FlexboxAlignmentGrid = ({
	selectedLayer,
	hasValue,
	onClear,
}: FlexboxAlignmentGridProps) => {
	const designerAction = useDesignerAction();

	const currentJustify =
		selectedLayer?.cssVars?.["--justify-content"] || "flex-start";
	const currentAlign =
		selectedLayer?.cssVars?.["--align-items"] || "flex-start";

	const handleAlignmentClick = (justifyContent: string, alignItems: string) => {
		if (selectedLayer) {
			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: selectedLayer.id,
					css: {
						"--display": "flex",
						"--justify-content": justifyContent,
						"--align-items": alignItems,
					},
				},
			});
		}
	};

	const isActive = (justifyContent: string, alignItems: string) => {
		return currentJustify === justifyContent && currentAlign === alignItems;
	};

	return (
		<DesignAction label="Layout" orientation="horizontal">
			<div className="grid h-fit w-fit grid-cols-3 grid-rows-3 gap-1 rounded-md bg-input p-1">
				{alignmentPositions.map((position, index) => (
					<Button
						key={index}
						onClick={() =>
							handleAlignmentClick(position.justifyContent, position.alignItems)
						}
						aria-label={position.ariaLabel}
						className={[
							"flex h-6 w-6 items-center justify-center rounded-sm text-[10px] transition-colors hover:bg-white/40",
							isActive(position.justifyContent, position.alignItems)
								? "bg-white text-black"
								: "bg-transparent text-muted-foreground",
						].join(" ")}
					>
						{/* Placeholder for icon - will be replaced with actual icons */}
						<span className="pointer-events-none select-none opacity-60">
							•
						</span>
					</Button>
				))}
			</div>
			<ClearButton hasValue={hasValue} handleClear={onClear} />
		</DesignAction>
	);
};
