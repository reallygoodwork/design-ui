import { IconBorderSides } from "@tabler/icons-react";
import { LinkedValuesControl } from "./LinkedValuesControl";

const FIELDS = [
	{ property: "--padding-block-start", label: "Top", short: "T" },
	{ property: "--padding-inline-end", label: "Right", short: "R" },
	{ property: "--padding-block-end", label: "Bottom", short: "B" },
	{ property: "--padding-inline-start", label: "Left", short: "L" },
];

export const ActionPadding = () => (
	<LinkedValuesControl
		label="Padding"
		fields={FIELDS}
		min={0}
		expandLabel="Edit each side"
		icon={<IconBorderSides />}
	/>
);
