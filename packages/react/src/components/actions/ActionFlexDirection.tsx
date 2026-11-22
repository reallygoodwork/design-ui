import {
	FlexDirectionColumn,
	FlexDirectionColumnReverse,
	FlexDirectionRow,
	FlexDirectionRowReverse,
} from "../../assets/icons";
import { useEffectiveCss } from "../../hooks/useBreakpointCss";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ToggleGroupControl } from "./ToggleGroupControl";

export const ActionFlexDirection = () => {
	const selectedLayers = useSelectedLayers();
	const selectedLayer = selectedLayers[0];
	const display = useEffectiveCss()["--display"];

	if (!selectedLayer || (display !== "flex" && display !== "inline-flex"))
		return null;

	return (
		<ToggleGroupControl
			cssProperty="--flex-direction"
			label="Direction"
			options={[
				{ label: "Row", value: "row", icon: <FlexDirectionRow /> },
				{
					label: "Row Reverse",
					value: "row-reverse",
					icon: <FlexDirectionRowReverse />,
				},
				{
					label: "Column",
					value: "column",
					icon: <FlexDirectionColumn />,
				},
				{
					label: "Column Reverse",
					value: "column-reverse",
					icon: <FlexDirectionColumnReverse />,
				},
			]}
			orientation="horizontal"
		/>
	);
};
