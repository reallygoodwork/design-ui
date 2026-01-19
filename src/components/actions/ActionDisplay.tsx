import { SelectActionControl } from "./SelectActionControl";

export const ActionDisplay = () => {
	return (
		<SelectActionControl
			cssProperty="--display"
			label="Display"
			defaultValue="block"
			options={[
				{
					label: "Block",
					value: "block",
				},
				{ label: "Inline", value: "inline" },
				{
					label: "Inline-Block",
					value: "inline-block",
				},
				{ label: "Flex", value: "flex" },
				{
					label: "Inline Flex",
					value: "inline-flex",
				},
				{ label: "Grid", value: "grid" },
			]}
			orientation="horizontal"
		/>
	);
};
