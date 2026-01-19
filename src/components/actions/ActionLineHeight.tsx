import { NumericActionControl } from "./NumericActionControl";

export const ActionLineHeight = () => {
	return (
		<NumericActionControl
			showSteppers={false}
			orientation="horizontal"
			cssProperty="--line-height"
			label="Line Height"
			defaultValue={1}
			units={["px", "rem", "em", ""]}
		/>
	);
};
