export type CubicBezier = [number, number, number, number];

export type TransitionConfig =
	| { type: "easing"; duration: number; ease: CubicBezier }
	| { type: "time"; visualDuration: number; bounce: number }
	| { type: "physics"; stiffness: number; damping: number; mass: number };

export type TransitionType = TransitionConfig["type"];

export const DEFAULT_TRANSITIONS: {
	[K in TransitionType]: Extract<TransitionConfig, { type: K }>;
} = {
	easing: { type: "easing", duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
	time: { type: "time", visualDuration: 0.5, bounce: 0.2 },
	physics: { type: "physics", stiffness: 170, damping: 20, mass: 1 },
};

export type SpringParams = {
	stiffness: number;
	damping: number;
	mass: number;
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

/** Time mode's two dials, as Motion converts them to a physical spring. */
export const springParams = (
	config: Exclude<TransitionConfig, { type: "easing" }>
): SpringParams => {
	if (config.type === "physics") return config;
	const root = (2 * Math.PI) / (config.visualDuration * 1.2);
	const stiffness = root * root;
	return {
		stiffness,
		damping: 2 * clamp(1 - config.bounce, 0.05, 1) * Math.sqrt(stiffness),
		mass: 1,
	};
};

/** Position of a spring going from 0 to 1, released at rest, at `t` seconds. */
export const springAt = (
	{ stiffness, damping, mass }: SpringParams,
	t: number
) => {
	const undamped = Math.sqrt(stiffness / mass);
	const ratio = damping / (2 * Math.sqrt(stiffness * mass));

	if (ratio < 1) {
		const damped = undamped * Math.sqrt(1 - ratio * ratio);
		const decay = Math.exp(-ratio * undamped * t);
		return (
			1 -
			decay *
				(Math.cos(damped * t) +
					((ratio * undamped) / damped) * Math.sin(damped * t))
		);
	}
	if (ratio === 1) {
		return 1 - Math.exp(-undamped * t) * (1 + undamped * t);
	}
	const spread = undamped * Math.sqrt(ratio * ratio - 1);
	const fast = -ratio * undamped - spread;
	const slow = -ratio * undamped + spread;
	return (
		1 - (fast * Math.exp(slow * t) - slow * Math.exp(fast * t)) / (fast - slow)
	);
};

const SETTLE_THRESHOLD = 0.001;
const MAX_SETTLE_SECONDS = 10;
const SETTLE_STEP = 1 / 240;

/** Seconds until the spring stays within 0.1% of its target. */
export const settleTime = (params: SpringParams) => {
	let settled = SETTLE_STEP;
	for (let t = 0; t < MAX_SETTLE_SECONDS; t += SETTLE_STEP) {
		if (Math.abs(springAt(params, t) - 1) > SETTLE_THRESHOLD) settled = t;
	}
	return Math.min(MAX_SETTLE_SECONDS, settled + SETTLE_STEP);
};

export type CurvePoint = { t: number; x: number };

/** Evenly spaced points on the spring, with `t` running 0 to 1. */
export const sampleSpring = (params: SpringParams, count = 200) => {
	const duration = settleTime(params);
	return Array.from({ length: count + 1 }, (_, index): CurvePoint => {
		const t = index / count;
		return { t, x: index === count ? 1 : springAt(params, t * duration) };
	});
};

const distanceFromLine = (p: CurvePoint, a: CurvePoint, b: CurvePoint) => {
	const dt = b.t - a.t;
	const dx = b.x - a.x;
	const length = Math.hypot(dt, dx) || 1;
	return Math.abs(dx * (p.t - a.t) - dt * (p.x - a.x)) / length;
};

/** Drop points that barely change the shape, keeping the stop list short. */
const simplify = (points: CurvePoint[], tolerance: number): CurvePoint[] => {
	if (points.length < 3) return points;
	const first = points[0];
	const last = points[points.length - 1];
	let furthest = 0;
	let index = 0;
	for (let i = 1; i < points.length - 1; i++) {
		const distance = distanceFromLine(points[i], first, last);
		if (distance > furthest) {
			furthest = distance;
			index = i;
		}
	}
	if (furthest <= tolerance) return [first, last];
	return [
		...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
		...simplify(points.slice(index), tolerance),
	];
};

const trim = (value: number, decimals: number) =>
	Number(value.toFixed(decimals));

/** CSS has no spring, but `linear()` can follow any curve through stops. */
export const toLinearEasing = (points: CurvePoint[]) => {
	const stops = simplify(points, 0.002).map(({ t, x }, index, all) => {
		const isEnd = index === 0 || index === all.length - 1;
		return isEnd ? `${trim(x, 4)}` : `${trim(x, 4)} ${trim(t * 100, 2)}%`;
	});
	return `linear(${stops.join(", ")})`;
};

export const transitionToCss = (config: TransitionConfig) => {
	if (config.type === "easing") {
		return {
			duration: `${trim(config.duration, 3)}s`,
			timingFunction: `cubic-bezier(${config.ease.join(", ")})`,
		};
	}
	const params = springParams(config);
	return {
		duration: `${trim(settleTime(params), 3)}s`,
		timingFunction: toLinearEasing(sampleSpring(params)),
	};
};

const CUBIC_BEZIER = /cubic-bezier\(([^)]+)\)/;

export const parseBezier = (text: string): CubicBezier | null => {
	const values = text.split(",").map((part) => Number(part.trim()));
	if (values.length !== 4 || values.some(Number.isNaN)) return null;
	const [x1, y1, x2, y2] = values;
	return [clamp(x1, 0, 1), clamp(y1, -1, 2), clamp(x2, 0, 1), clamp(y2, -1, 2)];
};

/** Read stored values back: the saved config, or a hand-written bezier. */
export const readTransition = (
	config: string | undefined,
	duration: string | undefined,
	timingFunction: string | undefined
): TransitionConfig | null => {
	if (config) {
		try {
			return JSON.parse(config) as TransitionConfig;
		} catch {
			// Fall through to the CSS values
		}
	}
	const bezier = timingFunction?.match(CUBIC_BEZIER);
	const ease = bezier ? parseBezier(bezier[1]) : null;
	if (!ease && !duration) return null;
	return {
		type: "easing",
		duration: Number.parseFloat(duration ?? "") || 0.3,
		ease: ease ?? DEFAULT_TRANSITIONS.easing.ease,
	};
};
