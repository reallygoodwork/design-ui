import { SelectActionControl } from "./SelectActionControl";

// Width axis of a variable font (CSS font-stretch). Fonts without one ignore it.
const WIDTHS = [
	{ label: "Ultra Condensed", value: "50%" },
	{ label: "Extra Condensed", value: "62.5%" },
	{ label: "Condensed", value: "75%" },
	{ label: "Semi Condensed", value: "87.5%" },
	{ label: "Normal", value: "100%" },
	{ label: "Semi Expanded", value: "112.5%" },
	{ label: "Expanded", value: "125%" },
	{ label: "Extra Expanded", value: "150%" },
];

export const ActionFontWidth = () => (
	<SelectActionControl
		cssProperty="--font-stretch"
		label="Width"
		options={WIDTHS}
		defaultValue="100%"
		orientation="horizontal"
	/>
);
