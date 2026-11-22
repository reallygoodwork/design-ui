import { type ReactNode, useEffect, useRef, useState } from "react";
import { formatCSSValue } from "../../lib/cssValueHelpers";
import { InputGroup } from "./InputGroup";
import { snapToStep } from "./ScrubField";
import { Select } from "./Select";

export const DEFAULT_UNITS = ["px", "%", "vw", "vh", "rem", "em"] as const;

// These units change a lot per whole number, so dragging moves in tenths.
const FINE_STEP_UNITS = ["rem", "em", ""];
const FINE_STEP = 0.1;

// How far the fill goes at each unit, when the control sets no limit.
const DEFAULT_SCALE: Record<string, number> = {
	px: 200,
	"%": 100,
	vw: 100,
	vh: 100,
	rem: 10,
	em: 10,
	"": 3,
};

const RAW_CSS = "css";

// A typed number applies once typing pauses, not on each key: "20px" typed
// into a rem field would otherwise apply 20rem before the "px" arrives.
const LIVE_DELAY_MS = 300;

const CSS_VALUE = /^(-?\d*\.?\d+)\s*([a-z%]*)$/i;

/** Parse "16px" or "1.5", or return null for anything else (like "auto"). */
export const parseValue = (text: string | undefined) => {
	const match = text?.trim().match(CSS_VALUE);
	return match ? { value: Number(match[1]), unit: match[2] } : null;
};

const PX_PER_REM = 16;
const RELATIVE_TO_ROOT = ["rem", "em"];

/** Keep a value's size when its unit changes, where that can be known. */
export const convertUnit = (value: number, from: string, to: string) => {
	const fromRoot = RELATIVE_TO_ROOT.includes(from);
	const toRoot = RELATIVE_TO_ROOT.includes(to);
	if (from === "px" && toRoot) return Number((value / PX_PER_REM).toFixed(3));
	if (fromRoot && to === "px") return Number((value * PX_PER_REM).toFixed(3));
	return value;
};

const UnitSuffix = ({
	items,
	value,
	onValueChange,
}: {
	items: { label: string; value: string }[];
	value: string;
	onValueChange: (value: string) => void;
}) => {
	if (items.length > 1) {
		return (
			<Select
				variant="suffix"
				items={items}
				value={value}
				onValueChange={onValueChange}
			/>
		);
	}
	return value ? (
		<span className="shrink-0 pr-2 font-mono text-muted-foreground text-value">
			{value}
		</span>
	) : null;
};

const suffixItems = (
	units: readonly string[],
	unit: string,
	keywords: readonly { label: string; value: string }[] = []
) => [
	...keywords,
	...(units.includes(unit) ? units : [...units, unit]).map((u) => ({
		label: u || "\u00d7",
		value: u,
	})),
];

export type SizeKeyword = { label: string; value: string };

export type UnitFieldProps = {
	/** Value set at this breakpoint, like "16px". */
	value?: string;
	/** Value shown as a hint when `value` is empty, like an inherited one. */
	placeholderValue?: string;
	placeholder?: string;
	units?: readonly string[];
	defaultUnit?: string;
	/** Where dragging starts when the field is empty. */
	defaultValue?: number;
	step?: number;
	min?: number;
	max?: number;
	/** Full-fill value per unit, for values with no `max`. Merged over defaults. */
	scale?: Record<string, number>;
	/** Named sizes offered beside the units, like Fill or Hug. */
	keywords?: readonly SizeKeyword[];
	addon?: ReactNode;
	/** A control at the end of the field, after the unit. */
	trailing?: ReactNode;
	ariaLabel?: string;
	onChange: (value: string) => void;
	onUnitChange?: (unit: string) => void;
};

/** What a field's stored values mean: a named size, or a number and unit. */
const resolveField = ({
	value,
	placeholderValue,
	units,
	defaultUnit,
	defaultValue,
	keywords,
	pickedUnit,
}: {
	value?: string;
	placeholderValue?: string;
	units: readonly string[];
	defaultUnit: string;
	defaultValue: number;
	keywords?: readonly SizeKeyword[];
	pickedUnit: string | null;
}) => {
	const keyword = keywords?.find(
		(item) => item.value === (value ?? placeholderValue ?? "")
	);
	const unitless = units.includes("") ? "" : defaultUnit;
	const parsed = keyword
		? null
		: (parseValue(value) ?? parseValue(placeholderValue));
	return {
		keyword,
		unitless,
		parsed,
		unit: parsed ? parsed.unit || unitless : (pickedUnit ?? defaultUnit),
		number: parsed?.value ?? defaultValue,
	};
};

/**
 * The behavior behind a number field: typing, drafts, units and named sizes.
 * `showUnitInText` puts the unit in the text, for fields too small for a picker.
 */
export const useUnitValue = (
	{
		value,
		placeholderValue,
		placeholder,
		units = DEFAULT_UNITS,
		defaultUnit = "px",
		defaultValue = 0,
		step = 1,
		min,
		max,
		scale,
		keywords,
		onChange,
		onUnitChange,
	}: UnitFieldProps,
	showUnitInText = false
) => {
	const [draft, setDraft] = useState<string | null>(null);
	const [pickedUnit, setPickedUnit] = useState<string | null>(null);
	const liveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const cancelLive = () => {
		if (liveTimer.current === null) return;
		clearTimeout(liveTimer.current);
		liveTimer.current = null;
	};
	// biome-ignore lint/correctness/useExhaustiveDependencies: clears on unmount only
	useEffect(() => cancelLive, []);

	const { keyword, unitless, parsed, unit, number } = resolveField({
		value,
		placeholderValue,
		units,
		defaultUnit,
		defaultValue,
		keywords,
		pickedUnit,
	});
	// calc(), clamp() and the like: show them, but they have no number to drag
	const isRawCss = Boolean(!parsed && !keyword && (value || placeholderValue));
	const stepSize = FINE_STEP_UNITS.includes(unit) ? FINE_STEP : step;

	const clamp = (n: number) => Math.min(max ?? n, Math.max(min ?? n, n));
	const write = (n: number, u: string) => onChange(formatCSSValue(n, u));

	const asText = (text: string | undefined) => {
		const shown = keyword ? null : parseValue(text);
		if (!shown) return undefined;
		return showUnitInText
			? `${shown.value}${shown.unit || unitless}`
			: `${shown.value}`;
	};

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const text = event.target.value;
		setDraft(text);
		cancelLive();
		const trimmed = text.trim();
		if (trimmed === "") {
			setPickedUnit(unit);
			onChange("");
			return;
		}
		const typed = Number(trimmed);
		if (Number.isNaN(typed)) return;
		liveTimer.current = setTimeout(() => {
			liveTimer.current = null;
			write(clamp(typed), unit);
		}, LIVE_DELAY_MS);
	};

	const commit = () => {
		cancelLive();
		if (draft === null) return;
		const text = draft.trim().toLowerCase();
		const typedKeyword = keywords?.find((k) => k.label.toLowerCase() === text);
		const typed = parseValue(draft);
		if (typedKeyword) {
			onChange(typedKeyword.value);
		} else if (typed?.unit && units.includes(typed.unit.toLowerCase())) {
			const nextUnit = typed.unit.toLowerCase();
			setPickedUnit(nextUnit);
			write(clamp(typed.value), nextUnit);
		} else if (typed && !typed.unit) {
			// A number committed before its pause ran out
			write(clamp(typed.value), unit);
		}
		setDraft(null);
	};

	const pickSuffix = (next: string) => {
		cancelLive();
		setDraft(null);
		if (next === RAW_CSS) return;
		const picked = keywords?.find((item) => item.value === next);
		if (picked) {
			onChange(picked.value);
			return;
		}
		setPickedUnit(next);
		if (onUnitChange) {
			onUnitChange(next);
		} else if (parsed || keyword) {
			// Also overrides an inherited value, in the unit that was asked for
			write(clamp(convertUnit(number, unit, next)), next);
		}
	};

	const stepBy = (direction: 1 | -1) => {
		cancelLive();
		setDraft(null);
		write(snapToStep(number + direction * stepSize, stepSize, min, max), unit);
	};

	const items = [
		...suffixItems(units, unit, keywords),
		...(isRawCss ? [{ label: "CSS", value: RAW_CSS }] : []),
	];

	return {
		inherited: !value && Boolean(placeholderValue),
		text: draft ?? asText(value) ?? (keyword ? "" : (value ?? "")),
		placeholderText: asText(placeholderValue) ?? placeholder,
		handleChange,
		commit,
		stepBy,
		items,
		suffixValue: isRawCss ? RAW_CSS : (keyword?.value ?? unit),
		pickSuffix,
		scrub: {
			value: number,
			min,
			max,
			step: stepSize,
			disabled: isRawCss,
			muted: !value,
			scaleMin: min ?? 0,
			// Nothing set and nothing to hint at means nothing to fill
			scaleMax:
				parsed || placeholder
					? (max ?? { ...DEFAULT_SCALE, ...scale }[unit])
					: undefined,
			onChange: (next: number) => {
				cancelLive();
				setDraft(null);
				write(next, unit);
			},
		},
	};
};

/**
 * A number with a unit: drag it, step it with the arrow keys, or type.
 * Typing "2rem" switches the unit when the edit is committed.
 */
export const UnitField = (props: UnitFieldProps) => {
	const field = useUnitValue(props);
	return (
		<InputGroup
			fullWidth
			value={field.text}
			onChange={field.handleChange}
			onBlur={field.commit}
			onKeyDown={(event) => {
				if (event.key === "Enter") field.commit();
			}}
			addon={props.addon}
			ariaLabel={props.ariaLabel}
			inherited={field.inherited}
			placeholder={field.placeholderText}
			scrub={field.scrub}
			suffix={
				<>
					<UnitSuffix
						items={field.items}
						value={field.suffixValue}
						onValueChange={field.pickSuffix}
					/>
					{props.trailing}
				</>
			}
		/>
	);
};
