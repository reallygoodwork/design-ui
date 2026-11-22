import { NumericActionControl } from "./NumericActionControl";

export const ActionLetterSpacing = () => {
	return (
		<NumericActionControl
			orientation="horizontal"
			cssProperty="--letter-spacing"
			scale={{ px: 20, "": 1, em: 1, rem: 1 }}
			label="Spacing"
			defaultValue={1}
			units={["px", "rem", "em"]}
		/>
	);
};
