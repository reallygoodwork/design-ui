import {
	IconLetterCase,
	IconLetterCaseLower,
	IconLetterCaseUpper,
	IconTypography,
} from "@tabler/icons-react";
import { ToggleGroupControl } from "./ToggleGroupControl";

export const ActionTextTransform = () => {
	return (
		<ToggleGroupControl
			cssProperty="--text-transform"
			label="Transform"
			orientation="horizontal"
			options={[
				{ label: "Normal", value: "normal", icon: <IconTypography /> },
				{
					label: "Uppercase",
					value: "uppercase",
					icon: <IconLetterCaseUpper />,
				},
				{
					label: "Lowercase",
					value: "lowercase",
					icon: <IconLetterCaseLower />,
				},
				{ label: "Capitalize", value: "capitalize", icon: <IconLetterCase /> },
			]}
		/>
	);
};
