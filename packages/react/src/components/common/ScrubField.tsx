import { type ReactNode, useRef, useState } from "react";
import { cn } from "../../lib/cn";

export type ScrubOptions = {
	value: number;
	min?: number;
	max?: number;
	step?: number;
	/** Range the fill shows when a value has no hard limit. Doesn't restrict it. */
	scaleMin?: number;
	scaleMax?: number;
	/** For fields too small to show a handle. */
	hideHandle?: boolean;
	/** For values that aren't numbers, like calc(). */
	disabled?: boolean;
	/** Paints the fill lighter, for an inherited value. */
	muted?: boolean;
	onChange: (value: number) => void;
};

// Movement before a press counts as a drag rather than a click to type.
const DRAG_THRESHOLD_PX = 3;

const clamp = (value: number, min = -Infinity, max = Infinity) =>
	Math.min(max, Math.max(min, value));

/** Clamp to the range, then snap to a step counted from `min` (or zero). */
export const snapToStep = (
	value: number,
	step: number,
	min?: number,
	max?: number
) => {
	const origin = min ?? 0;
	const snapped = origin + Math.round((value - origin) / step) * step;
	const decimals = (String(step).split(".")[1] ?? "").length;
	return clamp(Number(snapped.toFixed(decimals)), min, max);
};

type Drag = {
	pointerId: number;
	startX: number;
	startValue: number;
	input: HTMLInputElement;
	scrubbing: boolean;
};

/**
 * Makes a number input draggable: hover shows a slider on the field, dragging
 * changes the value, and a plain click still places focus for typing. With a
 * range or scale the fill shows the value's place in it. Without one the handle
 * follows the pointer.
 */
export const ScrubField = ({
	value,
	min,
	max,
	step = 1,
	scaleMin = min,
	scaleMax = max,
	hideHandle = false,
	disabled = false,
	muted = false,
	onChange,
	className,
	children,
	flushRight = false,
}: ScrubOptions & {
	className?: string;
	children: ReactNode;
	/** Squares the track's right side where it meets something in the field. */
	flushRight?: boolean;
}) => {
	const rootRef = useRef<HTMLDivElement>(null);
	const dragRef = useRef<Drag | null>(null);
	const [scrubbing, setScrubbing] = useState(false);

	const hasTrack =
		scaleMin !== undefined && scaleMax !== undefined && scaleMax > scaleMin;
	const percent = hasTrack
		? clamp(((value - scaleMin) / (scaleMax - scaleMin)) * 100, 0, 100)
		: null;

	const followPointer = (clientX: number) => {
		const root = rootRef.current;
		if (!root || hasTrack) return;
		const { left, width } = root.getBoundingClientRect();
		root.style.setProperty("--scrub-x", `${clamp(clientX - left, 0, width)}px`);
	};

	// Follows the pointer across the field, but never skips a step on tight ranges.
	const valuePerPixel = (width: number) =>
		hasTrack ? Math.min((scaleMax - scaleMin) / (width || 1), step * 2) : step;

	// Anything on the field starts a drag, except its own buttons
	const inputFor = (target: EventTarget, root: HTMLElement) => {
		if (disabled || !(target instanceof Element)) return null;
		if (target.closest("button, [role=combobox]")) return null;
		return root.querySelector("input");
	};

	const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
		const input = inputFor(event.target, event.currentTarget);
		// Stops the browser focusing the input and selecting text during a drag.
		if (event.button === 0 && input && document.activeElement !== input) {
			event.preventDefault();
		}
	};

	const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		const input = inputFor(event.target, event.currentTarget);
		if (event.button !== 0 || !input) return;
		if (document.activeElement === input) return; // Typing: leave it alone
		// From the start, so a fast drag off the field still reaches this element.
		event.currentTarget.setPointerCapture?.(event.pointerId);
		dragRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startValue: value,
			input,
			scrubbing: false,
		};
	};

	const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		followPointer(event.clientX);
		const drag = dragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;

		const distance = event.clientX - drag.startX;
		if (!drag.scrubbing) {
			if (Math.abs(distance) < DRAG_THRESHOLD_PX) return;
			drag.scrubbing = true;
			setScrubbing(true);
			if (document.activeElement instanceof HTMLElement) {
				document.activeElement.blur();
			}
		}

		const next = snapToStep(
			drag.startValue +
				distance * valuePerPixel(event.currentTarget.clientWidth),
			step,
			min,
			max
		);
		if (next !== value) onChange(next);
	};

	const endDrag = (event: React.PointerEvent, shouldFocus: boolean) => {
		const drag = dragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		dragRef.current = null;
		setScrubbing(false);
		if (shouldFocus && !drag.scrubbing) {
			drag.input.focus();
			drag.input.select();
		}
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: the input inside is the keyboard-accessible control
		<div
			ref={rootRef}
			data-slot="scrub-field"
			data-scrubbing={scrubbing || undefined}
			data-enabled={!disabled}
			className={cn(
				"group/scrub relative touch-pan-y data-scrubbing:cursor-ew-resize data-[enabled=true]:[&_input:not(:focus)]:cursor-ew-resize",
				className
			)}
			onMouseDown={handleMouseDown}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={(event) => endDrag(event, true)}
			onPointerCancel={(event) => endDrag(event, false)}
		>
			{children}
			<div
				aria-hidden="true"
				data-slot="scrub-track"
				className={cn(
					"pointer-events-none absolute inset-0 overflow-hidden rounded-md",
					flushRight && "rounded-r-none"
				)}
			>
				{percent !== null && (
					<span
						data-slot="scrub-fill"
						className={cn(
							"absolute inset-y-0 left-0",
							muted ? "bg-foreground/5" : "bg-foreground/10"
						)}
						style={{ width: `${percent}%` }}
					/>
				)}
				{!hideHandle && !disabled && (
					<span
						className={cn(
							"absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-background opacity-0 shadow-sm ring-1 ring-foreground/30 transition-opacity duration-100 group-hover/scrub:opacity-100 group-focus-within/scrub:opacity-0",
							scrubbing && "opacity-100!"
						)}
						style={{
							left:
								percent !== null
									? `clamp(4px, ${percent}%, calc(100% - 4px))`
									: "clamp(4px, var(--scrub-x, 50%), calc(100% - 4px))",
						}}
					/>
				)}
			</div>
		</div>
	);
};
