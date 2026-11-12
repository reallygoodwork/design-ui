import { NumericActionControl } from "./NumericActionControl";

export const ActionFontSize = () => {
	return (
		<NumericActionControl
			cssProperty="--font-size"
			scale={{ px: 120 }}
			min={0}
			label="Size"
			defaultValue={16}
			units={["px", "rem", "em"]}
			orientation="horizontal"
		/>
	);
};
