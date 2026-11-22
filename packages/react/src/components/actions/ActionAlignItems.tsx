import {
	AlignItemsBaseline,
	AlignItemsCenter,
	AlignItemsFlexEnd,
	AlignItemsFlexStart,
	AlignItemsStretch,
} from "../../assets/icons";
import { useEffectiveCss } from "../../hooks/useBreakpointCss";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ToggleGroupControl } from "./ToggleGroupControl";

export const ActionAlignItems = () => {
	const selectedLayers = useSelectedLayers();
	const selectedLayer = selectedLayers[0];
	const display = useEffectiveCss()["--display"];

	if (
		!selectedLayer ||
		(display !== "flex" &&
			display !== "inline-flex" &&
			display !== "grid" &&
			display !== "inline-grid")
	)
		return null;

	return (
		<ToggleGroupControl
			cssProperty="--align-items"
			label="Align"
			options={[
				{
					label: "Flex Start",
					value: "flex-start",
					icon: <AlignItemsFlexStart />,
				},
				{
					label: "Center",
					value: "center",
					icon: <AlignItemsCenter />,
				},
				{
					label: "Flex End",
					value: "flex-end",
					icon: <AlignItemsFlexEnd />,
				},
				{
					label: "Baseline",
					value: "baseline",
					icon: <AlignItemsBaseline />,
				},
				{
					label: "Stretch",
					value: "stretch",
					icon: <AlignItemsStretch />,
				},
			]}
			orientation="horizontal"
		/>
	);
};
