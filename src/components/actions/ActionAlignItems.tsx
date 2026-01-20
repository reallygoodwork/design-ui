import {
	AlignItemsBaseline,
	AlignItemsCenter,
	AlignItemsFlexEnd,
	AlignItemsFlexStart,
	AlignItemsStretch,
} from "../../assets/icons";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ToggleGroupControl } from "./ToggleGroupControl";

export const ActionAlignItems = () => {
	const selectedLayers = useSelectedLayers();
	const selectedLayer = selectedLayers[0];

	if (
		!selectedLayer ||
		(selectedLayer.cssVars?.["--display"] !== "flex" &&
			selectedLayer.cssVars?.["--display"] !== "inline-flex" &&
			selectedLayer.cssVars?.["--display"] !== "grid" &&
			selectedLayer.cssVars?.["--display"] !== "inline-grid")
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
					value: "flex-center",
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
			orientation="vertical"
		/>
	);
};
