import { IconBorderSides } from "@tabler/icons-react";
import { LinkedValuesControl } from "./LinkedValuesControl";

const FIELDS = [
	{ property: "--margin-block-start", label: "Top", short: "T" },
	{ property: "--margin-inline-end", label: "Right", short: "R" },
	{ property: "--margin-block-end", label: "Bottom", short: "B" },
	{ property: "--margin-inline-start", label: "Left", short: "L" },
];

export const ActionMargin = () => (
	<LinkedValuesControl
		label="Margin"
		fields={FIELDS}
		expandLabel="Edit each side"
		icon={<IconBorderSides />}
	/>
);
