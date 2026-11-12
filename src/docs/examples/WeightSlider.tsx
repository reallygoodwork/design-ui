import { SliderActionControl } from "../../components/actions/SliderActionControl";

export const WeightSlider = () => (
	<SliderActionControl
		cssProperty="--font-weight"
		label="Weight"
		defaultValue={400}
		min={100}
		max={900}
		step={100}
		orientation="horizontal"
	/>
);
