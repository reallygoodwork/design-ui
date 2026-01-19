import {
	IconAlignCenter,
	IconAlignJustified,
	IconAlignLeft,
	IconAlignRight,
} from "@tabler/icons-react";
import { ToggleGroupControl } from "./ToggleGroupControl";

export const ActionTextAlign = () => {
	return (
		<ToggleGroupControl
			cssProperty="--text-align"
			label="Alignment"
			options={[
				{ label: "Left", value: "left", icon: <IconAlignLeft /> },
				{ label: "Center", value: "center", icon: <IconAlignCenter /> },
				{ label: "Right", value: "right", icon: <IconAlignRight /> },
				{ label: "Justify", value: "justify", icon: <IconAlignJustified /> },
			]}
			orientation="horizontal"
		/>
	);
};
