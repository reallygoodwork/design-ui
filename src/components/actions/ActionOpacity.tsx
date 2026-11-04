import { Slider } from "@base-ui/react/slider";
import { useBreakpointCss } from "../../hooks/useBreakpointCss";
import { ClearButton } from "../common/ClearButton";
import { InputGroup } from "../common/InputGroup";
import { Tooltip } from "../common/Tooltip";
import { DesignAction } from "../DesignAction";

const CSS_PROPERTY = "--opacity";
const DEFAULT_PERCENT = 100;

/**
 * Read a stored opacity as a 0-100 percentage. CSS opacity is 0-1, so values
 * up to 1 are scaled. Values above 1 (written as raw 0-100 numbers by older
 * versions of this control) and "50%" strings are already percentages.
 * Ambiguity: a legacy "1" (meant 1%) is indistinguishable from a new-format
 * 1 (100%); we read it as 100%.
 */
const toPercent = (stored: string | undefined): number => {
	if (!stored) return DEFAULT_PERCENT;
	const n = parseFloat(stored);
	if (Number.isNaN(n)) return DEFAULT_PERCENT;
	const percent = stored.trim().endsWith("%") || n > 1 ? n : n * 100;
	return Math.min(100, Math.max(0, Math.round(percent)));
};

/** Convert a 0-100 percentage to a CSS opacity (0-1) string. */
const toCssOpacity = (percent: number): string =>
	String(Math.min(100, Math.max(0, Math.round(percent))) / 100);

export const ActionOpacity = () => {
	const {
		value,
		isExplicit,
		fromBreakpointName,
		isPrimary,
		setValue,
		clearValue,
	} = useBreakpointCss(CSS_PROPERTY);
	const percent = toPercent(value);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const text = e.target.value.trim();
		if (text === "") return clearValue();
		const n = Number(text);
		if (!Number.isNaN(n)) setValue(toCssOpacity(n));
	};

	const handleSliderChange = (next: number | number[]) => {
		setValue(toCssOpacity(Array.isArray(next) ? next[0] : next));
	};

	// Same convention as NumericActionControl: inherited values show as a
	// placeholder with a tooltip, explicit overrides get a label marker.
	const inheritanceTooltip =
		!isPrimary && fromBreakpointName
			? isExplicit
				? `Overrides ${fromBreakpointName}`
				: `Inherited from ${fromBreakpointName}`
			: undefined;
	const label = !isPrimary && isExplicit ? "Opacity \u2022" : "Opacity";

	return (
		<DesignAction label={label} orientation="horizontal">
			<div className="flex items-center gap-1">
				<Tooltip content={inheritanceTooltip}>
					<div className="flex-1">
						<InputGroup
							value={isExplicit || isPrimary ? String(percent) : ""}
							placeholder={String(percent)}
							onChange={handleInputChange}
						/>
					</div>
				</Tooltip>
			</div>
			<Slider.Root
				value={[percent]}
				onValueChange={handleSliderChange}
				min={0}
				max={100}
				step={1}
			>
				<Slider.Control className="flex w-16 touch-none items-center py-3 select-none pr-2">
					<Slider.Track className="h-1 w-full rounded bg-input select-none">
						<Slider.Indicator className="rounded bg-blue-600 select-none" />
						<Slider.Thumb
							aria-label="Opacity"
							className="size-2.5 rounded bg-white outline outline-gray-300 select-none has-focus-visible:outline-2 has-focus-visible:outline-blue-800"
						/>
					</Slider.Track>
				</Slider.Control>
			</Slider.Root>
			<ClearButton hasValue={isExplicit} handleClear={clearValue} />
		</DesignAction>
	);
};
