import {
	IconBorderCorners,
	IconRadiusBottomLeft,
	IconRadiusBottomRight,
	IconRadiusTopLeft,
	IconRadiusTopRight,
} from "@tabler/icons-react";
import { LinkedValuesControl } from "./LinkedValuesControl";
import { RadiusPreview } from "./RadiusPreview";

const FIELDS = [
	{
		property: "--border-top-left-radius",
		label: "Top Left",
		short: <IconRadiusTopLeft />,
	},
	{
		property: "--border-top-right-radius",
		label: "Top Right",
		short: <IconRadiusTopRight />,
	},
	{
		property: "--border-bottom-left-radius",
		label: "Bottom Left",
		short: <IconRadiusBottomLeft />,
	},
	{
		property: "--border-bottom-right-radius",
		label: "Bottom Right",
		short: <IconRadiusBottomRight />,
	},
];

export const ActionBorderRadius = () => (
	<LinkedValuesControl
		label="Radius"
		fields={FIELDS}
		min={0}
		scale={{ px: 50 }}
		units={["px", "%", "rem"]}
		expandLabel="Edit each corner"
		icon={<IconBorderCorners />}
		preview={(values) => <RadiusPreview values={values} />}
	/>
);
