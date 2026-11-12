import { useEffectiveCss } from "../../hooks/useBreakpointCss";
import { ColorActionPopover } from "./ColorActionPopover";
import { NumericActionControl } from "./NumericActionControl";

export const ActionTextShadow = () => {
	const vars = useEffectiveCss();
	const parts = [
		vars["--text-shadow-offset-x"],
		vars["--text-shadow-offset-y"],
		vars["--text-shadow-blur-radius"],
	];
	const currentValue =
		vars["--text-shadow-color"] || parts.some(Boolean)
			? parts.map((v) => v || "0").join(" ")
			: "";
	return (
		<ColorActionPopover
			cssProperty="--text-shadow-color"
			label="Shadow"
			popoverTitle="Text shadow"
			triggerDisplayValue={currentValue}
		>
			<NumericActionControl
				cssProperty="--text-shadow-blur-radius"
				scale={{ px: 50 }}
				min={0}
				label="Blur"
				defaultValue={1}
				orientation="horizontal"
			/>
			<NumericActionControl
				cssProperty="--text-shadow-offset-x"
				scale={{ px: 50 }}
				label="Offset X"
				defaultValue={1}
				orientation="horizontal"
			/>
			<NumericActionControl
				cssProperty="--text-shadow-offset-y"
				scale={{ px: 50 }}
				label="Offset Y"
				defaultValue={1}
				orientation="horizontal"
			/>
		</ColorActionPopover>
	);
};
