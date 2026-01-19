import {
	IconArrowAutofitContentFilled,
	IconLayout2Filled,
	IconLayoutGrid,
	IconViewportNarrow,
	IconViewportWide,
} from "@tabler/icons-react";
import { ToggleGroupControl } from "./ToggleGroupControl";

export const ActionDisplay = () => {
	return (
		<ToggleGroupControl
			cssProperty="--display"
			label="Display"
			options={[
				{
					label: "Block",
					value: "block",
					icon: <IconArrowAutofitContentFilled />,
				},
				{ label: "Inline", value: "inline", icon: <IconViewportNarrow /> },
				{
					label: "Inline-Block",
					value: "inline-block",
					icon: <IconViewportWide />,
				},
				{ label: "Flex", value: "flex", icon: <IconLayout2Filled /> },
				{
					label: "Inline Flex",
					value: "inline-flex",
					icon: <IconLayout2Filled />,
				},
				{ label: "Grid", value: "grid", icon: <IconLayoutGrid /> },
			]}
			orientation="vertical"
		/>
	);
};
