import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import {
	type CubicBezier,
	DEFAULT_TRANSITIONS,
	parseBezier,
	readTransition,
	springParams,
	type TransitionConfig,
	type TransitionType,
	transitionToCss,
} from "@design-ui/core";
import { IconPlayerPlay } from "@tabler/icons-react";
import { useMemo, useRef, useState } from "react";
import { useBreakpointCssGroup } from "../../hooks/useBreakpointCss";
import { InputGroup } from "../common/InputGroup";
import { UnitField } from "../common/UnitField";
import { DesignAction } from "../DesignAction";
import { ActionPopover } from "./ActionPopover";
import { BezierChart, SpringChart } from "./TransitionCharts";

const CONFIG = "--transition-config";
const DURATION = "--transition-duration";
const TIMING = "--transition-timing-function";
const PROPERTIES = [CONFIG, DURATION, TIMING];

const TYPES: { label: string; value: TransitionType }[] = [
	{ label: "Easing", value: "easing" },
	{ label: "Time", value: "time" },
	{ label: "Physics", value: "physics" },
];

const SECONDS = ["s"];
const UNITLESS = [""];

type DialProps = {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	units?: string[];
	onChange: (value: number) => void;
};

const Dial = ({ label, value, min, max, step, units, onChange }: DialProps) => {
	const unit = units?.[0] ?? "";
	return (
		<DesignAction label={label}>
			<div className="min-w-0 flex-1">
				<UnitField
					value={`${value}${unit}`}
					units={units ?? UNITLESS}
					defaultUnit={unit}
					min={min}
					max={max}
					step={step}
					ariaLabel={label}
					onChange={(next) => {
						const parsed = Number.parseFloat(next);
						if (!Number.isNaN(parsed)) onChange(parsed);
					}}
				/>
			</div>
		</DesignAction>
	);
};

const EaseField = ({
	ease,
	onChange,
}: {
	ease: CubicBezier;
	onChange: (ease: CubicBezier) => void;
}) => {
	const [draft, setDraft] = useState<string | null>(null);
	return (
		<DesignAction label="Ease">
			<div className="min-w-0 flex-1">
				<InputGroup
					fullWidth
					ariaLabel="Cubic bezier values"
					value={draft ?? ease.join(", ")}
					onChange={(event) => {
						setDraft(event.target.value);
						const parsed = parseBezier(event.target.value);
						if (parsed) onChange(parsed);
					}}
					onBlur={() => setDraft(null)}
				/>
			</div>
		</DesignAction>
	);
};

const Preview = ({
	duration,
	easing,
}: {
	duration: string;
	easing: string;
}) => {
	const dotRef = useRef<HTMLSpanElement>(null);

	const play = () => {
		const dot = dotRef.current;
		const distance = (dot?.parentElement?.clientWidth ?? 0) - 20;
		dot?.animate?.(
			[
				{ transform: "translateX(0)" },
				{ transform: `translateX(${distance}px)` },
			],
			{ duration: Number.parseFloat(duration) * 1000, easing, fill: "both" }
		);
	};

	return (
		<button
			type="button"
			aria-label="Play preview"
			onClick={play}
			className="group relative flex h-7 w-full items-center overflow-hidden rounded-md bg-input px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<span
				ref={dotRef}
				className="block size-3 rounded-sm bg-foreground will-change-transform"
			/>
			<IconPlayerPlay className="absolute right-2 size-3 text-muted-foreground group-hover:text-foreground" />
		</button>
	);
};

const describe = (config: TransitionConfig | null, settled?: string) => {
	if (!config) return "None";
	if (config.type === "easing") return `Ease ${config.duration}s`;
	// Time mode's duration is the one the designer set, not the settling time
	return `Spring ${config.type === "time" ? `${config.visualDuration}s` : settled}`;
};

/**
 * Edits a layer's transition: a cubic Bézier, or a spring set by feel (Time) or
 * by physical values (Physics). Springs are written as CSS `linear()` easing.
 */
export const ActionTransition = () => {
	const group = useBreakpointCssGroup(PROPERTIES);
	const [configValue, durationValue, timingValue] = group.entries.map(
		(entry) => entry.value
	);
	const stored = readTransition(configValue, durationValue, timingValue);
	const config = stored ?? DEFAULT_TRANSITIONS.easing;
	const css = useMemo(() => transitionToCss(config), [config]);

	const write = (next: TransitionConfig) => {
		const { duration, timingFunction } = transitionToCss(next);
		group.write({
			[CONFIG]: JSON.stringify(next),
			[DURATION]: duration,
			[TIMING]: timingFunction,
		});
	};

	return (
		<ActionPopover
			label={group.isOverride ? "Transition •" : "Transition"}
			popoverTitle="Transition"
			property={DURATION}
			triggerDisplayValue={describe(stored, durationValue)}
			hasValue={group.hasExplicit}
			inherited={!group.isPrimary && group.isInherited}
			onClear={group.clearAll}
		>
			{config.type === "easing" ? (
				<BezierChart
					ease={config.ease}
					onChange={(ease) => write({ ...config, ease })}
				/>
			) : (
				<SpringChart params={springParams(config)} />
			)}
			<Preview duration={css.duration} easing={css.timingFunction} />
			<DesignAction label="Type">
				<ToggleGroup
					aria-label="Transition type"
					value={[config.type]}
					onValueChange={(next) => {
						if (next[0]) write(DEFAULT_TRANSITIONS[next[0] as TransitionType]);
					}}
					className="flex h-7 min-w-0 flex-1 items-center justify-end gap-0.5 rounded-md bg-input p-1"
				>
					{TYPES.map((type) => (
						<Toggle
							key={type.value}
							value={type.value}
							className="flex h-full shrink-0 items-center justify-center rounded-sm px-2 text-caption hover:bg-raised/50 data-pressed:bg-raised data-pressed:shadow-xs data-pressed:font-medium"
						>
							{type.label}
						</Toggle>
					))}
				</ToggleGroup>
			</DesignAction>
			{config.type === "easing" && (
				<>
					<EaseField
						ease={config.ease}
						onChange={(ease) => write({ ...config, ease })}
					/>
					<Dial
						label="Duration"
						value={config.duration}
						min={0}
						max={2}
						step={0.01}
						units={SECONDS}
						onChange={(duration) => write({ ...config, duration })}
					/>
				</>
			)}
			{config.type === "time" && (
				<>
					<Dial
						label="Bounce"
						value={config.bounce}
						min={0}
						max={1}
						step={0.01}
						onChange={(bounce) => write({ ...config, bounce })}
					/>
					<Dial
						label="Duration"
						value={config.visualDuration}
						min={0.05}
						max={2}
						step={0.01}
						units={SECONDS}
						onChange={(visualDuration) => write({ ...config, visualDuration })}
					/>
				</>
			)}
			{config.type === "physics" && (
				<>
					<Dial
						label="Stiffness"
						value={config.stiffness}
						min={1}
						max={1000}
						step={1}
						onChange={(stiffness) => write({ ...config, stiffness })}
					/>
					<Dial
						label="Damping"
						value={config.damping}
						min={1}
						max={100}
						step={1}
						onChange={(damping) => write({ ...config, damping })}
					/>
					<Dial
						label="Mass"
						value={config.mass}
						min={0.1}
						max={10}
						step={0.1}
						onChange={(mass) => write({ ...config, mass })}
					/>
				</>
			)}
		</ActionPopover>
	);
};
