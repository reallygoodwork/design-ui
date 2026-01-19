import { IconItalic, IconTypography } from "@tabler/icons-react";
import { ToggleGroupControl } from "./ToggleGroupControl";

export const ActionTextStyle = () => {
	return (
		<ToggleGroupControl
			cssProperty="--text-style"
			label="Style"
			orientation="horizontal"
			options={[
				{ label: "Normal", value: "normal", icon: <IconTypography /> },
				{ label: "Italic", value: "italic", icon: <IconItalic /> },
			]}
		/>
	);
};
