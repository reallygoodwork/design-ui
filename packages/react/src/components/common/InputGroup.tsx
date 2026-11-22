"use client";
import { Input } from "@base-ui/react/input";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useRowLabel } from "./RowLabel";
import { ScrubField, type ScrubOptions, snapToStep } from "./ScrubField";

/** The field's shared surface, dashed when its value is inherited. */
const surfaceClass = (
	fullWidth: boolean,
	hasSurface: boolean,
	inherited: boolean
) =>
	cn(
		"relative flex min-w-0 items-center gap-1",
		fullWidth && "w-full",
		hasSurface &&
			"gap-0 rounded-md bg-input focus-within:ring-2 focus-within:ring-ring",
		// Carried over from a smaller breakpoint: dashed, like the box model
		inherited &&
			"rounded-md outline-1 outline-dashed outline-foreground/35 -outline-offset-1"
	);

/** Arrow up and down step a draggable field by its step size. */
const stepWithArrows = (
	e: React.KeyboardEvent<HTMLInputElement>,
	scrub: ScrubOptions
) => {
	if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
	e.preventDefault();
	const step = scrub.step ?? 1;
	const next = scrub.value + (e.key === "ArrowUp" ? step : -step);
	scrub.onChange(snapToStep(next, step, scrub.min, scrub.max));
};

/**
 * A single field. An addon, the input and a suffix share one surface, and each
 * keeps its own space, so a long value can never run under its neighbors.
 */
export const InputGroup = ({
	addon,
	value,
	onChange,
	type,
	placeholder,
	scrub,
	fullWidth = false,
	suffix,
	ariaLabel,
	inherited = false,
	onBlur,
	onKeyDown,
}: {
	addon?: ReactNode;
	value: string;
	onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
	type?: string;
	placeholder?: string;
	/** Turns the field into a draggable slider. */
	scrub?: ScrubOptions;
	fullWidth?: boolean;
	/** Sits inside the field at the right, such as a unit. */
	suffix?: ReactNode;
	ariaLabel?: string;
	/** Shows a value carried over from a smaller breakpoint. */
	inherited?: boolean;
	onBlur?: () => void;
	onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) => {
	const rowLabel = useRowLabel();
	const hasSurface = Boolean(addon || suffix);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		onKeyDown?.(e);
		if (scrub) stepWithArrows(e, scrub);
	};

	const content = (
		<>
			{addon ? (
				<span
					data-slot="addon"
					className="pointer-events-none flex shrink-0 items-center whitespace-nowrap pl-2 font-medium text-caption text-muted-foreground leading-none [&_svg]:size-3"
				>
					{addon}
				</span>
			) : null}
			<Input
				className={cn(
					scrub ? "text-right" : undefined,
					"flex h-7 w-full min-w-0 flex-1 truncate rounded-md border border-transparent bg-input px-2 py-1 font-mono text-value outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive pointer-coarse:text-base",
					hasSurface &&
						"bg-transparent pr-2.5 pl-1 focus-visible:border-transparent focus-visible:ring-0"
				)}
				data-slot="input"
				inputMode={"numeric"}
				type={type || "text"}
				spellCheck="false"
				aria-roledescription="Number input"
				autoCorrect="off"
				autoCapitalize="off"
				role={scrub ? "spinbutton" : undefined}
				aria-valuemin={scrub?.min}
				aria-valuemax={scrub?.max}
				aria-valuenow={
					scrub?.value ?? (value ? parseInt(value, 10) : undefined)
				}
				onKeyDown={handleKeyDown}
				onBlur={onBlur}
				aria-label={ariaLabel ?? rowLabel}
				aria-description={inherited ? "Inherited" : undefined}
				title={value || undefined}
				value={value || ""}
				onChange={onChange}
				placeholder={placeholder}
			/>
		</>
	);

	return (
		<div
			data-slot="input-group"
			className={cn(
				"group/input-group relative flex items-center",
				fullWidth ? "w-full" : "w-fit"
			)}
		>
			<div
				data-slot="input-number"
				className={surfaceClass(fullWidth, hasSurface, inherited)}
			>
				{scrub ? (
					<ScrubField
						{...scrub}
						flushRight={Boolean(suffix)}
						className={cn(
							"flex min-w-0 items-center",
							fullWidth && "w-full flex-1"
						)}
					>
						{content}
					</ScrubField>
				) : (
					content
				)}
				{/* Outside the slider, so its handle can never sit on these */}
				{suffix}
			</div>
		</div>
	);
};
