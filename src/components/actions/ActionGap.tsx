import { IconBorderInner } from "@tabler/icons-react";
import { useEffectiveCss } from "../../hooks/useBreakpointCss";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { LinkedValuesControl } from "./LinkedValuesControl";

const FIELDS = [
	{ property: "--row-gap", label: "Row", short: "R" },
	{ property: "--column-gap", label: "Column", short: "C" },
];

const LAYOUTS_WITH_GAP = ["flex", "inline-flex", "grid", "inline-grid"];

export const ActionGap = () => {
	const [layer] = useSelectedLayers();
	const display = useEffectiveCss()["--display"];

	if (!layer || !display || !LAYOUTS_WITH_GAP.includes(display)) return null;

	return (
		<LinkedValuesControl
			label="Gap"
			fields={FIELDS}
			min={0}
			expandLabel="Edit rows and columns"
			icon={<IconBorderInner />}
		/>
	);
};
