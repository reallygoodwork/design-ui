import { useMemo } from "react";
import { useAnyEditable } from "../../hooks/useAllowed";
import {
	useBreakpointCssGroup,
	useEffectiveCss,
} from "../../hooks/useBreakpointCss";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ActionPopover } from "./ActionPopover";
import { NumericActionControl } from "./NumericActionControl";
import { SelectActionControl } from "./SelectActionControl";

const POSITION_OPTIONS = [
	{ label: "Static", value: "static" },
	{ label: "Relative", value: "relative" },
	{ label: "Absolute", value: "absolute" },
	{ label: "Fixed", value: "fixed" },
	{ label: "Sticky", value: "sticky" },
	{ label: "Inherit", value: "inherit" },
	{ label: "Initial", value: "initial" },
	{ label: "Revert", value: "revert" },
	{ label: "Revert layer", value: "revert-layer" },
	{ label: "Unset", value: "unset" },
] as const;

const EDGE_PROPERTIES = ["top", "right", "bottom", "left"] as const;
const ALL_PROPERTIES = ["position", ...EDGE_PROPERTIES];

export const ActionPosition = () => {
	const selectedLayers = useSelectedLayers();
	const designerAction = useDesignerAction();
	const selectedLayer = selectedLayers[0];

	const vars = useEffectiveCss();
	const group = useBreakpointCssGroup(ALL_PROPERTIES);
	const editable = useAnyEditable(ALL_PROPERTIES);
	const currentPosition = vars.position || "static";

	// Format display value
	const displayValue = useMemo(() => {
		const appliedValues = EDGE_PROPERTIES.map((prop) => {
			const rawValue = vars[prop];
			if (!rawValue) return null;
			return `${prop} ${rawValue}`;
		}).filter(Boolean);

		const name =
			POSITION_OPTIONS.find((o) => o.value === currentPosition)?.label ??
			currentPosition;
		return [name, ...appliedValues].join(", ");
	}, [currentPosition, vars]);

	const handleClear = () => {
		if (selectedLayer) {
			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: selectedLayer.id,
					css: {
						position: "",
						top: "",
						right: "",
						bottom: "",
						left: "",
					},
				},
			});
		}
	};

	if (!editable) return null;

	return (
		<ActionPopover
			label="Position"
			popoverTitle="Position"
			triggerDisplayValue={displayValue}
			hasValue={group.hasExplicit}
			inherited={!group.isPrimary && group.isInherited}
			onClear={handleClear}
		>
			<div className="flex flex-col gap-2">
				<SelectActionControl
					cssProperty="position"
					label="Type"
					options={POSITION_OPTIONS}
					defaultValue="static"
					orientation="horizontal"
				/>

				{EDGE_PROPERTIES.map((property) => (
					<NumericActionControl
						key={property}
						cssProperty={property}
						label={property.charAt(0).toUpperCase() + property.slice(1)}
						orientation="horizontal"
					/>
				))}
			</div>
		</ActionPopover>
	);
};
