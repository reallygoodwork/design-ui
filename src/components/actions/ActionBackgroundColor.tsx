import { ColorActionPopover } from "./ColorActionPopover";

export const ActionBackgroundColor = () => {
	return (
		<ColorActionPopover
			cssProperty="--background-color"
			label="Background"
			popoverTitle="Background Color"
		/>
	);
};
