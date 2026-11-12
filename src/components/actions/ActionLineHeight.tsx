import { NumericActionControl } from "./NumericActionControl";

export const ActionLineHeight = () => {
	return (
		<NumericActionControl
			orientation="horizontal"
			cssProperty="--line-height"
			scale={{ px: 120 }}
			min={0}
			label="Line Height"
			defaultValue={1}
			units={["px", "rem", "em", ""]}
		/>
	);
};
