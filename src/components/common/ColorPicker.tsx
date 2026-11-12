import { Slider } from "@base-ui/react/slider";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useEffect, useRef, useState } from "react";
import {
	COLOR_FORMATS,
	type ColorFormat,
	detectFormat,
	formatColor,
	type Hsva,
	hsvaToHex,
	hsvaToString,
	hsvToBytes,
	parseToHsva,
} from "../../lib/color";

const DEFAULT_COLOR: Hsva = { h: 0, s: 0, v: 0, a: 1 };

// The canvas is scaled up smoothly, so this is plenty and repaints instantly.
const SQUARE_WIDTH = 64;
const SQUARE_HEIGHT = 40;

const HUE_TRACK = `linear-gradient(to right, ${Array.from(
	{ length: 13 },
	(_, index) => hsvaToHex({ h: index * 30, s: 1, v: 1 })
).join(", ")})`;

const CHECKERBOARD =
	"repeating-conic-gradient(#d4d4d8 0% 25%, #ffffff 0% 50%) 0 0 / 8px 8px";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const ColorSquare = ({
	color,
	onChange,
}: {
	color: Hsva;
	onChange: (color: Hsva) => void;
}) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const context = canvasRef.current?.getContext("2d");
		if (!context) return;
		const image = context.createImageData(SQUARE_WIDTH, SQUARE_HEIGHT);
		for (let y = 0; y < SQUARE_HEIGHT; y++) {
			for (let x = 0; x < SQUARE_WIDTH; x++) {
				const [r, g, b] = hsvToBytes(
					color.h,
					x / (SQUARE_WIDTH - 1),
					1 - y / (SQUARE_HEIGHT - 1)
				);
				const offset = (y * SQUARE_WIDTH + x) * 4;
				image.data.set([r, g, b, 255], offset);
			}
		}
		context.putImageData(image, 0, 0);
	}, [color.h]);

	const moveTo = (event: React.PointerEvent<HTMLDivElement>) => {
		const { left, top, width, height } =
			event.currentTarget.getBoundingClientRect();
		onChange({
			...color,
			s: clamp01((event.clientX - left) / width),
			v: 1 - clamp01((event.clientY - top) / height),
		});
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		const delta = event.shiftKey ? 0.1 : 0.01;
		const moves: Record<string, Partial<Hsva>> = {
			ArrowLeft: { s: clamp01(color.s - delta) },
			ArrowRight: { s: clamp01(color.s + delta) },
			ArrowUp: { v: clamp01(color.v + delta) },
			ArrowDown: { v: clamp01(color.v - delta) },
		};
		const move = moves[event.key];
		if (!move) return;
		event.preventDefault();
		onChange({ ...color, ...move });
	};

	return (
		<div
			role="slider"
			tabIndex={0}
			aria-label="Saturation and brightness"
			aria-valuenow={Math.round(color.s * 100)}
			aria-valuetext={`Saturation ${Math.round(color.s * 100)}%, brightness ${Math.round(color.v * 100)}%`}
			className="relative h-36 w-full cursor-crosshair touch-none overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
			onPointerDown={(event) => {
				event.currentTarget.setPointerCapture?.(event.pointerId);
				moveTo(event);
			}}
			onPointerMove={(event) => {
				if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
					moveTo(event);
				}
			}}
			onKeyDown={handleKeyDown}
		>
			<canvas
				ref={canvasRef}
				width={SQUARE_WIDTH}
				height={SQUARE_HEIGHT}
				className="absolute inset-0 size-full"
			/>
			<span
				className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute size-3 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.3)]"
				style={{
					left: `${color.s * 100}%`,
					top: `${(1 - color.v) * 100}%`,
				}}
			/>
		</div>
	);
};

const TrackSlider = ({
	label,
	value,
	max,
	step,
	background,
	onChange,
}: {
	label: string;
	value: number;
	max: number;
	step: number;
	background: string;
	onChange: (value: number) => void;
}) => (
	<div className="relative flex h-7 items-center rounded-md bg-input pr-2 pl-2">
		<span className="w-16 shrink-0 font-medium text-caption text-muted-foreground">
			{label}
		</span>
		<Slider.Root
			className="min-w-0 flex-1"
			value={[value]}
			min={0}
			max={max}
			step={step}
			onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
		>
			<Slider.Control className="flex h-7 touch-none items-center select-none">
				<Slider.Track
					className="h-3 w-full rounded-sm select-none"
					style={{ background }}
				>
					<Slider.Thumb
						aria-label={label}
						className="h-4 w-2.5 rounded-sm border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.3)] select-none has-focus-visible:outline-2 has-focus-visible:outline-ring"
					/>
				</Slider.Track>
			</Slider.Control>
		</Slider.Root>
	</div>
);

/**
 * A square of saturation and brightness, hue and opacity sliders, and a text
 * field, writing hex, OKLCH or Display P3. Any CSS color can be typed.
 */
export const ColorPicker = ({
	value,
	onChange,
}: {
	value: string | undefined;
	onChange: (value: string) => void;
}) => {
	const [format, setFormat] = useState<ColorFormat>(
		() => detectFormat(value) ?? "hex"
	);
	const [color, setColor] = useState<Hsva>(
		() => parseToHsva(value) ?? DEFAULT_COLOR
	);
	const [draft, setDraft] = useState<string | null>(null);
	const lastWritten = useRef(value);

	// Follow changes from elsewhere, like undo, but not our own writes, whose
	// rounding would otherwise nudge the picker. Gray has no hue, so keep ours.
	useEffect(() => {
		if (value === lastWritten.current) return;
		lastWritten.current = value;
		const parsed = parseToHsva(value);
		if (!parsed) return;
		setColor((previous) => ({
			...parsed,
			h: parsed.s === 0 ? previous.h : parsed.h,
		}));
	}, [value]);

	const write = (next: string) => {
		lastWritten.current = next;
		onChange(next);
	};

	const pick = (next: Hsva) => {
		setColor(next);
		setDraft(null);
		write(hsvaToString(next, format));
	};

	const handleTyping = (text: string) => {
		setDraft(text);
		if (!text.trim()) {
			write("");
			return;
		}
		const parsed = parseToHsva(text);
		if (!parsed) return;
		const typedFormat = detectFormat(text) ?? format;
		setFormat(typedFormat);
		setColor(parsed);
		write(formatColor(text, typedFormat) ?? text);
	};

	const changeFormat = (next: ColorFormat) => {
		setFormat(next);
		setDraft(null);
		const converted = formatColor(value, next);
		if (converted) write(converted);
	};

	const isInvalid = Boolean(draft?.trim()) && !parseToHsva(draft ?? "");
	const solid = hsvaToHex(color);

	return (
		<div className="flex flex-col gap-1">
			<ToggleGroup
				aria-label="Color format"
				value={[format]}
				onValueChange={(next) => {
					if (next[0]) changeFormat(next[0] as ColorFormat);
				}}
				className="flex h-7 items-center gap-0.5 rounded-md bg-input p-1"
			>
				{COLOR_FORMATS.map((option) => (
					<Toggle
						key={option.value}
						value={option.value}
						className="flex h-full flex-1 items-center justify-center rounded-sm text-caption hover:bg-raised/50 data-pressed:bg-raised data-pressed:shadow-xs data-pressed:font-medium"
					>
						{option.label}
					</Toggle>
				))}
			</ToggleGroup>
			<ColorSquare color={color} onChange={pick} />
			<TrackSlider
				label="Hue"
				value={color.h}
				max={360}
				step={0.5}
				background={HUE_TRACK}
				onChange={(h) => pick({ ...color, h })}
			/>
			<TrackSlider
				label="Opacity"
				value={Math.round(color.a * 100)}
				max={100}
				step={1}
				background={`linear-gradient(to right, transparent, ${solid}), ${CHECKERBOARD}`}
				onChange={(percent) => pick({ ...color, a: percent / 100 })}
			/>
			<input
				aria-label="Color value"
				aria-invalid={isInvalid}
				spellCheck={false}
				autoCapitalize="off"
				autoCorrect="off"
				placeholder="#000000"
				value={draft ?? formatColor(value, format) ?? value ?? ""}
				onChange={(event) => handleTyping(event.target.value)}
				onBlur={() => setDraft(null)}
				className="h-7 w-full min-w-0 rounded-md border border-transparent bg-input px-2 font-mono text-value outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive"
			/>
		</div>
	);
};
