import { useMemo, useRef } from "react";
import {
	type CubicBezier,
	type CurvePoint,
	type SpringParams,
	sampleSpring,
} from "../../lib/easing";

const WIDTH = 224;
const HEIGHT = 168;
const INSET_X = 16;

// Room above and below 0-1, for handles that overshoot.
const Y_MIN = -0.5;
const Y_MAX = 1.5;

const toX = (x: number) => INSET_X + x * (WIDTH - INSET_X * 2);
const toY = (y: number) => HEIGHT - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * HEIGHT;

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));
const hundredths = (value: number) => Math.round(value * 100) / 100;

const chartClass =
	"block h-auto w-full rounded-md bg-input text-foreground outline-none";

const Guides = () => (
	<g className="stroke-foreground/10" strokeWidth={1}>
		{[0.25, 0.5, 0.75].map((position) => (
			<line
				key={position}
				x1={toX(position)}
				x2={toX(position)}
				y1={0}
				y2={HEIGHT}
			/>
		))}
		<line x1={0} x2={WIDTH} y1={toY(0)} y2={toY(0)} />
		<line x1={0} x2={WIDTH} y1={toY(1)} y2={toY(1)} />
	</g>
);

type HandleIndex = 0 | 1;

/** A cubic Bézier with two handles to drag, or to move with the arrow keys. */
export const BezierChart = ({
	ease,
	onChange,
}: {
	ease: CubicBezier;
	onChange: (ease: CubicBezier) => void;
}) => {
	const svgRef = useRef<SVGSVGElement>(null);
	const [x1, y1, x2, y2] = ease;

	const setHandle = (handle: HandleIndex, x: number, y: number) => {
		const point = [clamp(x, 0, 1), clamp(y, Y_MIN, Y_MAX)].map(hundredths);
		onChange(
			handle === 0 ? [point[0], point[1], x2, y2] : [x1, y1, point[0], point[1]]
		);
	};

	const dragHandle = (
		handle: HandleIndex,
		event: React.PointerEvent<SVGCircleElement>
	) => {
		const rect = svgRef.current?.getBoundingClientRect();
		if (!rect) return;
		const scale = WIDTH / rect.width;
		const chartX = (event.clientX - rect.left) * scale;
		const chartY = (event.clientY - rect.top) * scale;
		setHandle(
			handle,
			(chartX - INSET_X) / (WIDTH - INSET_X * 2),
			Y_MIN + ((HEIGHT - chartY) / HEIGHT) * (Y_MAX - Y_MIN)
		);
	};

	const handleKey = (
		handle: HandleIndex,
		event: React.KeyboardEvent<SVGCircleElement>
	) => {
		const delta = event.shiftKey ? 0.1 : 0.01;
		const offsets: Record<string, [number, number]> = {
			ArrowLeft: [-delta, 0],
			ArrowRight: [delta, 0],
			ArrowUp: [0, delta],
			ArrowDown: [0, -delta],
		};
		const offset = offsets[event.key];
		if (!offset) return;
		event.preventDefault();
		const [x, y] = handle === 0 ? [x1, y1] : [x2, y2];
		setHandle(handle, x + offset[0], y + offset[1]);
	};

	const handles = [
		{ index: 0 as const, x: x1, y: y1, from: [0, 0], name: "First" },
		{ index: 1 as const, x: x2, y: y2, from: [1, 1], name: "Second" },
	];

	return (
		<svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={chartClass}>
			<Guides />
			<line
				x1={toX(0)}
				y1={toY(0)}
				x2={toX(1)}
				y2={toY(1)}
				className="stroke-foreground/30"
				strokeDasharray="3 3"
			/>
			{handles.map(({ index, x, y, from, name }) => (
				<g key={name}>
					<line
						x1={toX(from[0])}
						y1={toY(from[1])}
						x2={toX(x)}
						y2={toY(y)}
						className="stroke-foreground/40"
					/>
					<circle
						cx={toX(x)}
						cy={toY(y)}
						r={5}
						className="fill-background stroke-foreground"
						strokeWidth={1.5}
					/>
					<circle
						role="slider"
						tabIndex={0}
						aria-label={`${name} handle`}
						aria-valuenow={y}
						aria-valuetext={`x ${x}, y ${y}`}
						cx={toX(x)}
						cy={toY(y)}
						r={12}
						className="cursor-grab touch-none fill-transparent outline-none focus-visible:stroke-ring"
						onPointerDown={(event) =>
							event.currentTarget.setPointerCapture?.(event.pointerId)
						}
						onPointerMove={(event) => {
							if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
								dragHandle(index, event);
							}
						}}
						onKeyDown={(event) => handleKey(index, event)}
					/>
				</g>
			))}
			<path
				d={`M ${toX(0)} ${toY(0)} C ${toX(x1)} ${toY(y1)}, ${toX(x2)} ${toY(y2)}, ${toX(1)} ${toY(1)}`}
				fill="none"
				className="pointer-events-none stroke-foreground"
				strokeWidth={2}
				strokeLinecap="round"
			/>
		</svg>
	);
};

const linePath = (points: CurvePoint[], yMin: number, yMax: number) =>
	points
		.map(
			({ t, x }, index) =>
				`${index === 0 ? "M" : "L"} ${(t * WIDTH).toFixed(1)} ${(
					HEIGHT - ((x - yMin) / (yMax - yMin)) * HEIGHT
				).toFixed(1)}`
		)
		.join(" ");

/** The spring's position over its full settling time. */
export const SpringChart = ({ params }: { params: SpringParams }) => {
	const { path, targetY } = useMemo(() => {
		const points = sampleSpring(params);
		const yMin = -0.15;
		const yMax = Math.max(1.15, ...points.map((point) => point.x)) + 0.1;
		return {
			path: linePath(points, yMin, yMax),
			targetY: HEIGHT - ((1 - yMin) / (yMax - yMin)) * HEIGHT,
		};
	}, [params]);

	return (
		<svg
			viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
			className={chartClass}
			role="img"
			aria-label="Spring curve"
		>
			<g className="stroke-foreground/10" strokeWidth={1}>
				{[0.25, 0.5, 0.75].map((position) => (
					<line
						key={position}
						x1={position * WIDTH}
						x2={position * WIDTH}
						y1={0}
						y2={HEIGHT}
					/>
				))}
			</g>
			<line
				x1={0}
				x2={WIDTH}
				y1={targetY}
				y2={targetY}
				className="stroke-foreground/30"
				strokeDasharray="3 3"
			/>
			<path
				d={path}
				fill="none"
				className="stroke-foreground"
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
};
