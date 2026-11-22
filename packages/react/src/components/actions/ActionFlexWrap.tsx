import { FlexWrapNoWrap, FlexWrapWrap } from "../../assets/icons";
import { useEffectiveCss } from "../../hooks/useBreakpointCss";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ToggleGroupControl } from "./ToggleGroupControl";

export const ActionFlexWrap = () => {
	const selectedLayers = useSelectedLayers();
	const selectedLayer = selectedLayers[0];
	const display = useEffectiveCss()["--display"];

	if (!selectedLayer || (display !== "flex" && display !== "inline-flex"))
		return null;

	return (
		<ToggleGroupControl
			cssProperty="--flex-wrap"
			label="Wrap"
			options={[
				{ label: "Wrap", value: "wrap", icon: <FlexWrapWrap /> },
				{ label: "No Wrap", value: "nowrap", icon: <FlexWrapNoWrap /> },
			]}
			orientation="horizontal"
		/>
	);
};
