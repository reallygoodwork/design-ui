import { SliderActionControl } from "./SliderActionControl";

export const ActionOpacity = () => {
	return (
		<SliderActionControl
			orientation="horizontal"
			cssProperty="--opacity"
			label="Opacity"
			defaultValue={1}
			min={0}
			max={1}
			step={0.01}
		/>
	);
};
