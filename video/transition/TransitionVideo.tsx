import { IconSquare, IconWaveSine } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { ActionBorderRadius } from "../../src/components/actions/ActionBorderRadius";
import { ActionOpacity } from "../../src/components/actions/ActionOpacity";
import { ActionTransition } from "../../src/components/actions/ActionTransition";
import { DesignerPane } from "../../src/components/DesignerPane";
import { Sandbox } from "../../src/docs/Sandbox";
import { useSelectedLayers } from "../../src/hooks/useSelectedLayers";
import {
	type CubicBezier,
	DEFAULT_TRANSITIONS,
	type TransitionConfig,
	transitionToCss,
} from "../../src/lib/easing";
import type { Layer } from "../../src/lib/Types";
import { type Act, Stage } from "../kit";
import {
	countLoop,
	find,
	PortalHome,
	press,
	StoreBridge,
	tag,
	writeCss,
} from "../shared";
import "./transition.css";

// The real Transition control, open beside the real Motion pane. A card on
// the canvas plays the transition after every change, so each curve is seen
// as the motion it makes.
//
// Beats: open the row, scrub Duration slower, drag the Bézier's second handle
// past 1 (the card overshoots), switch to a spring, scrub Bounce up (the card
// wobbles), back to Easing, close. Easing's defaults are the first frame's.

type Pose = "start" | "poster";
type S = { pose: Pose };

const initial: S = { pose: "start" };
const poster: S = { pose: "poster" };
const REST = { x: 450, y: 596 };

const SLOW = 0.8;
const OVERSHOOT: CubicBezier = [0.25, 0.1, 0.3, 1.45];

const cssFor = (config: TransitionConfig) => {
	const { duration, timingFunction } = transitionToCss(config);
	return {
		"--transition-config": JSON.stringify(config),
		"--transition-duration": duration,
		"--transition-timing-function": timingFunction,
	};
};

const layersFor = (pose: Pose): Layer[] => [
	{
		id: "card",
		type: "frame",
		name: "Card",
		value: "",
		cssVars: cssFor(
			pose === "poster"
				? { type: "easing", duration: SLOW, ease: OVERSHOOT }
				: DEFAULT_TRANSITIONS.easing
		),
	},
];

const write = (config: TransitionConfig) => writeCss("card", cssFor(config));

// The card's replay, called by the script after each change
const motion: { replay: () => void } = { replay: () => {} };

/**
 * The selected layer on the canvas. It crosses its track with the layer's own
 * transition each time it's asked to, alternating sides.
 */
const Canvas = () => {
	const [layer] = useSelectedLayers();
	const card = useRef<HTMLDivElement>(null);
	const side = useRef(0);
	const css = useRef(layer?.cssVars);
	css.current = layer?.cssVars;

	useEffect(() => {
		motion.replay = () => {
			const el = card.current;
			const track = el?.parentElement;
			if (!el || !track) return;
			const travel = track.clientWidth - el.offsetWidth - 128;
			const from = side.current * travel;
			side.current = 1 - side.current;
			const to = side.current * travel;
			for (const animation of el.getAnimations()) animation.cancel();
			el.animate(
				[
					{ transform: `translateX(${from}px)` },
					{ transform: `translateX(${to}px)` },
				],
				{
					duration:
						Number.parseFloat(css.current?.["--transition-duration"] ?? "0.3") *
						1000,
					easing: css.current?.["--transition-timing-function"] ?? "ease",
					fill: "forwards",
				}
			);
		};
	}, []);

	return (
		<div className="tv-track">
			<div ref={card} className="tv-card">
				<span className="tv-card__label">Card</span>
			</div>
		</div>
	);
};

const isChart = (node: Node): node is SVGSVGElement =>
	node instanceof SVGSVGElement &&
	node.getAttribute("viewBox") === "0 0 224 168";

/**
 * The control swaps the Bézier chart for the spring chart outright. Here the
 * old one stays a moment over the new one and fades, so the curve changes
 * shape instead of blinking.
 */
const crossfadeCharts = (scene: HTMLElement) => {
	const observer = new MutationObserver((records) => {
		// React reports the removal and the insertion as separate records
		const nodes = (pick: (r: MutationRecord) => NodeList) =>
			records.flatMap((r) => Array.from(pick(r)));
		const added = nodes((r) => r.addedNodes).find(isChart);
		const removed = nodes((r) => r.removedNodes).find(isChart);
		const parent = added?.parentElement;
		if (!added || !removed || !parent) return;
		parent.style.position = "relative";
		Object.assign(removed.style, {
			position: "absolute",
			left: `${added.offsetLeft}px`,
			top: `${added.offsetTop}px`,
			width: `${added.clientWidth}px`,
			pointerEvents: "none",
		});
		parent.appendChild(removed);
		removed
			.animate([{ opacity: 1 }, { opacity: 0 }], {
				duration: 220,
				easing: "ease-out",
				fill: "forwards",
			})
			.finished.then(() => removed.remove());
		added.animate([{ opacity: 0 }, { opacity: 1 }], {
			duration: 220,
			easing: "ease-out",
		});
	});
	observer.observe(scene, { childList: true, subtree: true });
	return observer;
};

/** Scrub a field: the cursor drags across it while the store follows. */
const scrub = async (
	a: Act<S>,
	name: string,
	from: number,
	to: number,
	apply: (value: number) => void,
	round: (value: number) => number
) => {
	await a.move({ at: name, x: 0.3, y: 0.5 });
	await a.drag(
		{ at: name, x: 0.85, y: 0.5 },
		(_at, _from, t) => apply(round(from + (to - from) * t)),
		{ duration: 1000 }
	);
	apply(to);
};

const hundredths = (value: number) => Math.round(value * 100) / 100;

// The Bézier chart's own geometry (TransitionCharts.tsx)
const CHART = { width: 224, height: 168, inset: 16, yMin: -0.5, yMax: 1.5 };
const chartPoint = (a: Act<S>, x: number, y: number) => {
	const r = a.rect("chart");
	const s = r.width / CHART.width;
	return {
		x: r.x + (CHART.inset + x * (CHART.width - CHART.inset * 2)) * s,
		y:
			r.y +
			(CHART.height -
				((y - CHART.yMin) / (CHART.yMax - CHART.yMin)) * CHART.height) *
				s,
	};
};

const field = (label: string) => find(`input[aria-label="${label}"]`);
const typeTab = (label: string) =>
	find('[aria-label="Transition type"] button', label);

async function script(a: Act<S>) {
	countLoop();
	await a.wait(800);

	a.mark("open");
	await press(
		a,
		"row",
		find(".tv-panel [data-slot=action] button", "Ease 0.3s")
	);
	await a.wait(700);

	a.mark("duration");
	tag("duration", field("Duration"));
	await scrub(
		a,
		"duration",
		0.3,
		SLOW,
		(duration) => write({ ...DEFAULT_TRANSITIONS.easing, duration }),
		hundredths
	);
	motion.replay();
	await a.wait(1300);

	a.mark("curve");
	const chart = find('[aria-label="Second handle"]');
	tag("chart", chart?.closest("svg") ?? undefined);
	const start = chartPoint(a, 0.25, 1);
	const end = chartPoint(a, OVERSHOOT[2], OVERSHOOT[3]);
	await a.move(start);
	await a.drag(
		end,
		(_at, _from, t) =>
			write({
				type: "easing",
				duration: SLOW,
				ease: [
					0.25,
					0.1,
					hundredths(0.25 + (OVERSHOOT[2] - 0.25) * t),
					hundredths(1 + (OVERSHOOT[3] - 1) * t),
				],
			}),
		{ duration: 900 }
	);
	write({ type: "easing", duration: SLOW, ease: OVERSHOOT });
	motion.replay();
	await a.wait(1500);

	a.mark("spring");
	await press(a, "time", typeTab("Time"));
	motion.replay();
	await a.wait(1500);

	a.mark("bounce");
	tag("bounce", field("Bounce"));
	await scrub(
		a,
		"bounce",
		0.2,
		0.6,
		(bounce) => write({ ...DEFAULT_TRANSITIONS.time, bounce }),
		hundredths
	);
	motion.replay();
	await a.wait(2000);

	a.mark("reset");
	await press(a, "easing", typeTab("Easing"));
	await a.wait(600);
	await press(
		a,
		"row",
		find(".tv-panel [data-slot=action] button", "Ease 0.3s")
	);
	await a.wait(300);
	// Closing hands focus back to the row; the first frame has none
	(document.activeElement as HTMLElement | null)?.blur();
	await a.wait(200);
	await a.move(REST);
	await a.wait(500);
}

export const TransitionVideo = () => (
	<Stage
		width={500}
		height={625}
		initial={initial}
		poster={poster}
		script={script}
		play="loop"
		cursor={{ at: REST, style: "large", idle: false }}
		className="tv"
	>
		{(s) => (
			<PortalHome className="tv-scene" watch={crossfadeCharts}>
				<Sandbox key={s.pose} layers={layersFor(s.pose)} selectedId="card">
					<StoreBridge />
					<Canvas />
					<div className="tv-panel">
						<DesignerPane
							title="Motion"
							category="motion"
							icon={<IconWaveSine />}
						>
							<ActionTransition />
						</DesignerPane>
						<DesignerPane title="Layer" category="layer" icon={<IconSquare />}>
							<ActionOpacity />
							<ActionBorderRadius />
						</DesignerPane>
					</div>
				</Sandbox>
			</PortalHome>
		)}
	</Stage>
);
