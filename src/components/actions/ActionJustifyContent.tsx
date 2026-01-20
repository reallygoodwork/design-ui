import {
	JustifyContentCenter,
	JustifyContentFlexEnd,
	JustifyContentFlexStart,
	JustifyContentSpaceAround,
	JustifyContentSpaceBetween,
	JustifyContentSpaceEvenly,
} from "../../assets/icons";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ToggleGroupControl } from "./ToggleGroupControl";

export const ActionJustifyContent = () => {
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
			cssProperty="--justify-content"
			label="Justify"
			options={[
				{
					label: "Flex Start",
					value: "flex-start",
					icon: <JustifyContentFlexStart />,
				},
				{
					label: "Center",
					value: "center",
					icon: <JustifyContentCenter />,
				},
				{
					label: "Flex End",
					value: "flex-end",
					icon: <JustifyContentFlexEnd />,
				},
				{
					label: "Space Between",
					value: "space-between",
					icon: <JustifyContentSpaceBetween />,
				},
				{
					label: "Space Evenly",
					value: "space-evenly",
					icon: <JustifyContentSpaceEvenly />,
				},
				{
					label: "Space Around",
					value: "space-around",
					icon: <JustifyContentSpaceAround />,
				},
			]}
			orientation="vertical"
		/>
	);
};
