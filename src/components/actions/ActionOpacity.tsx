import { SliderActionControl } from "./SliderActionControl";

export const ActionOpacity = () => {
	return (
		<SliderActionControl
			orientation="horizontal"
			cssProperty="--opacity"
			label="Opacity"
			defaultValue={100}
			min={0}
			max={100}
			step={1}
		/>
	);
};
