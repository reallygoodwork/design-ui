import { SelectActionControl } from "./SelectActionControl";

const WEIGHTS = [
	{ label: "Thin", value: "100" },
	{ label: "Extra Light", value: "200" },
	{ label: "Light", value: "300" },
	{ label: "Regular", value: "400" },
	{ label: "Medium", value: "500" },
	{ label: "Semibold", value: "600" },
	{ label: "Bold", value: "700" },
	{ label: "Extra Bold", value: "800" },
	{ label: "Black", value: "900" },
];

export const ActionFontWeight = () => (
	<SelectActionControl
		cssProperty="--font-weight"
		label="Weight"
		options={WEIGHTS}
		defaultValue="400"
		orientation="horizontal"
		tokenType="fontWeight"
	/>
);
