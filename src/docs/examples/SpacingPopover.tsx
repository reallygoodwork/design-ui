import { ActionPopover } from "../../components/actions/ActionPopover";
import { NumericActionControl } from "../../components/actions/NumericActionControl";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";

export const SpacingPopover = () => {
	const [layer] = useSelectedLayers();
	const top = layer?.cssVars?.["--padding-block-start"];
	const side = layer?.cssVars?.["--padding-inline-start"];

	return (
		<ActionPopover
			label="Spacing"
			popoverTitle="Spacing"
			triggerDisplayValue={`${top ?? "0"} / ${side ?? "0"}`}
			hasValue={Boolean(top || side)}
		>
			<NumericActionControl cssProperty="--padding-block-start" label="Top" />
			<NumericActionControl cssProperty="--padding-inline-start" label="Left" />
		</ActionPopover>
	);
};
