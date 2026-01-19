import { useMemo } from "react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { ActionPopover } from "./ActionPopover";
import { NumericActionControl } from "./NumericActionControl";

export const ActionBorderRadius = () => {
	const selectedLayers = useSelectedLayers();
	const selectedLayer = selectedLayers[0];
	const designerAction = useDesignerAction();

	const borderTopLeftRadius =
		selectedLayer?.cssVars?.["--border-top-left-radius"];
	const borderTopRightRadius =
		selectedLayer?.cssVars?.["--border-top-right-radius"];
	const borderBottomRightRadius =
		selectedLayer?.cssVars?.["--border-bottom-right-radius"];
	const borderBottomLeftRadius =
		selectedLayer?.cssVars?.["--border-bottom-left-radius"];

	const triggerDisplayValue = useMemo(() => {
		const values = [
			borderTopLeftRadius,
			borderTopRightRadius,
			borderBottomRightRadius,
			borderBottomLeftRadius,
		];
		const hasAnyValue = values.some((v) => v);

		if (!hasAnyValue) return "";

		// If all values are the same, show single value
		const uniqueValues = [...new Set(values.filter(Boolean))];
		if (uniqueValues.length === 1) {
			return uniqueValues[0];
		}

		// Show abbreviated format: tl tr br bl
		return values.map((v) => v || "0").join(" ");
	}, [
		borderTopLeftRadius,
		borderTopRightRadius,
		borderBottomRightRadius,
		borderBottomLeftRadius,
	]);

	const hasValue = useMemo(() => {
		return Boolean(
			borderTopLeftRadius ||
				borderTopRightRadius ||
				borderBottomRightRadius ||
				borderBottomLeftRadius
		);
	}, [
		borderTopLeftRadius,
		borderTopRightRadius,
		borderBottomRightRadius,
		borderBottomLeftRadius,
	]);

	const handleClear = () => {
		if (selectedLayer) {
			designerAction({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: selectedLayer.id,
					css: {
						"--border-top-left-radius": "",
						"--border-top-right-radius": "",
						"--border-bottom-right-radius": "",
						"--border-bottom-left-radius": "",
					},
				},
			});
		}
	};

	return (
		<ActionPopover
			label="Radius"
			popoverTitle="Border Radius"
			triggerDisplayValue={triggerDisplayValue ?? ""}
			hasValue={hasValue}
			onClear={handleClear}
		>
			<NumericActionControl
				cssProperty="--border-top-left-radius"
				label="Top Left"
				defaultValue={0}
				showSteppers={false}
				orientation="horizontal"
				units={["px", "%", "rem"]}
			/>
			<NumericActionControl
				cssProperty="--border-top-right-radius"
				label="Top Right"
				defaultValue={0}
				showSteppers={false}
				orientation="horizontal"
				units={["px", "%", "rem"]}
			/>
			<NumericActionControl
				cssProperty="--border-bottom-right-radius"
				label="Bottom Right"
				defaultValue={0}
				showSteppers={false}
				orientation="horizontal"
				units={["px", "%", "rem"]}
			/>
			<NumericActionControl
				cssProperty="--border-bottom-left-radius"
				label="Bottom Left"
				defaultValue={0}
				showSteppers={false}
				orientation="horizontal"
				units={["px", "%", "rem"]}
			/>
		</ActionPopover>
	);
};
