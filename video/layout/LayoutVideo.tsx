import { IconLayoutGrid } from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { ActionLayout } from "../../src/components/actions/ActionLayout";
import { DesignerPane } from "../../src/components/DesignerPane";
import { LayerStage, Sandbox } from "../../src/docs/Sandbox";
import { useLayers } from "../../src/hooks/useLayers";
import type { Layer } from "../../src/lib/Types";
import { type Act, Stage } from "../kit";
import { countLoop, find, press, StoreBridge, store, tag } from "../shared";
import "./layout.css";

// The real Layout control driving a real frame. The cursor is drawn by the
// stage; each press also clicks the real element, so what changes on the
// canvas is the component's own output, not an illustration of it.
//
// Beats: Row (the tiles fall into a line), the middle spot (they glide to the
// center), Gap scrubbed (they spread), Column (they stack and the pad turns
// with them), Default (back where the loop began).

type Pose = "start" | "poster";
type S = { pose: Pose };

const REST = { x: 430, y: 560 };

const initial: S = { pose: "start" };
// The payoff: a row, centered, spaced out
const poster: S = { pose: "poster" };

const GAP_FROM = 8;
const GAP_TO = 28;

const tile = (id: string, label: string): Layer => ({
	id,
	type: "text",
	name: label,
	value: label,
	cssVars: {
		"--background-color": "#ffffff",
		"--color": "#18181b",
		"--font-size": "13px",
		"--font-weight": "500",
		// One width, so centered tiles share their edges
		"--min-width": "64px",
		"--text-align": "center",
		"--padding-block-start": "10px",
		"--padding-block-end": "10px",
		"--padding-inline-start": "14px",
		"--padding-inline-end": "14px",
		"--border-top-left-radius": "8px",
		"--border-top-right-radius": "8px",
		"--border-bottom-left-radius": "8px",
		"--border-bottom-right-radius": "8px",
	},
});

const layersFor = (pose: Pose): Layer[] => [
	{
		id: "f",
		type: "frame",
		name: "Frame",
		value: "",
		cssVars: {
			"--background-color": "#d8e2ff",
			"--height": "176px",
			"--padding-block-start": "12px",
			"--padding-block-end": "12px",
			"--padding-inline-start": "12px",
			"--padding-inline-end": "12px",
			"--border-top-left-radius": "14px",
			"--border-top-right-radius": "14px",
			"--border-bottom-left-radius": "14px",
			"--border-bottom-right-radius": "14px",
			"--column-gap": `${GAP_FROM}px`,
			"--row-gap": `${GAP_FROM}px`,
			...(pose === "poster" && {
				"--display": "flex",
				"--flex-direction": "row",
				"--justify-content": "center",
				"--align-items": "center",
				"--column-gap": `${GAP_TO}px`,
			}),
		},
		children: [tile("a", "One"), tile("b", "Two"), tile("c", "Three")],
	},
];

// The FLIP switch: off while a value is scrubbed, so tiles follow it live
const bridge = { flip: true };

type Box = { x: number; y: number; w: number; h: number };
const boxOf = (el: HTMLElement): Box => ({
	x: el.offsetLeft,
	y: el.offsetTop,
	w: el.offsetWidth,
	h: el.offsetHeight,
});

/**
 * Like boxOf, in fractional pixels: offsetLeft rounds, and a tile pinned at a
 * rounded box hops by the remainder when it is let go. Rects are on screen,
 * so divide out the zoom the stage draws at.
 */
const exactBoxOf = (el: HTMLElement, parent: HTMLElement): Box => {
	const outer = parent.getBoundingClientRect();
	const inner = el.getBoundingClientRect();
	const scale = outer.width / parent.offsetWidth || 1;
	return {
		x: (inner.left - outer.left) / scale,
		y: (inner.top - outer.top) / scale,
		w: inner.width / scale,
		h: inner.height / scale,
	};
};

const PINNED = ["position", "left", "top", "width", "height", "margin"];

const unpin = (el: HTMLElement) => {
	for (const animation of el.getAnimations()) animation.cancel();
	for (const property of PINNED) el.style.removeProperty(property);
};

/**
 * Glides a tile from its last box to its new one. While it travels it is
 * pinned absolutely at the new box, so its changing size can't push its
 * siblings around mid-flight.
 */
const flipTile = (el: HTMLElement, last: Box, next: Box) => {
	const dx = last.x - next.x;
	const dy = last.y - next.y;
	const moved = Math.abs(dx) + Math.abs(dy) > 0.5;
	const resized = Math.abs(last.w - next.w) + Math.abs(last.h - next.h) > 0.5;
	if (!moved && !resized) return;
	Object.assign(el.style, {
		position: "absolute",
		left: `${next.x}px`,
		top: `${next.y}px`,
		width: `${next.w}px`,
		height: `${next.h}px`,
		margin: "0",
	});
	const animation = el.animate(
		[
			{
				transform: `translate(${dx}px, ${dy}px)`,
				width: `${last.w}px`,
				height: `${last.h}px`,
			},
			// Size settles in the first half, so wide tiles narrow before they
			// pass each other instead of sliding over one another
			{ offset: 0.5, width: `${next.w}px`, height: `${next.h}px` },
			{
				transform: "translate(0, 0)",
				width: `${next.w}px`,
				height: `${next.h}px`,
			},
		],
		{ duration: 520, easing: EASE }
	);
	animation.onfinish = () => unpin(el);
};

/**
 * The canvas, with every layout change played as motion: each layer starts
 * where it was and travels to where the new CSS put it (FLIP).
 */
const Canvas = () => {
	const layers = useLayers();
	const host = useRef<HTMLDivElement>(null);
	const boxes = useRef(new WeakMap<HTMLElement, Box>());

	// biome-ignore lint/correctness/useExhaustiveDependencies: replays on every layer change
	useLayoutEffect(() => {
		const root = host.current;
		if (!root) return;
		const frame = root.querySelector<HTMLElement>(":scope > div > div");
		if (!frame) return;
		const tiles = Array.from(frame.children as HTMLCollectionOf<HTMLElement>);
		// A change mid-flight starts from the new layout, not the pinned one
		for (const el of tiles) unpin(el);
		// Measure every tile before animating any
		const measured = tiles.map((el) => {
			const next = exactBoxOf(el, root.firstElementChild as HTMLElement);
			const last = boxes.current.get(el);
			boxes.current.set(el, next);
			return { el, next, last };
		});
		if (!bridge.flip) return;
		for (const { el, next, last } of measured) {
			if (last) flipTile(el, last, next);
		}
	}, [layers]);

	return (
		<div ref={host} className="lv-canvas">
			<LayerStage className="lv-frame" />
		</div>
	);
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** A row React removed, kept a moment where it stood, fading out. */
const fadeOutGhost = (node: HTMLElement, last: Box, list: HTMLElement) => {
	node.setAttribute("data-ghost", "");
	Object.assign(node.style, {
		position: "absolute",
		left: `${last.x}px`,
		top: `${last.y}px`,
		width: `${last.w}px`,
		pointerEvents: "none",
	});
	list.appendChild(node);
	node
		.animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: 180,
			easing: "ease-out",
			fill: "forwards",
		})
		.finished.then(() => node.remove());
};

/** A new row fades in; a row that moved slides from where it was. */
const slideRow = (el: HTMLElement, last: Box | undefined) => {
	if (!last) {
		el.animate(
			[
				{ opacity: 0, transform: "translateY(-6px)" },
				{ opacity: 1, transform: "none" },
			],
			{ duration: 280, delay: 140, easing: EASE, fill: "backwards" }
		);
		return;
	}
	const dy = last.y - boxOf(el).y;
	if (Math.abs(dy) > 0.5) {
		el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], {
			duration: 460,
			easing: EASE,
		});
	}
};

/**
 * The panel's rows, animated as the control mounts and unmounts them: a new
 * row fades in, a removed one fades out where it stood, and the rows below
 * slide to their new places instead of jumping.
 */
const PanelMotion = ({ children }: { children: React.ReactNode }) => {
	const wrap = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const list = wrap.current?.querySelector<HTMLElement>(
			'[data-slot="designer-pane-content"] > div'
		);
		if (!list) return;
		list.style.position = "relative";
		const rows = () =>
			Array.from(list.children as HTMLCollectionOf<HTMLElement>).filter(
				(el) => !el.hasAttribute("data-ghost")
			);
		let boxes = new Map(rows().map((el) => [el, boxOf(el)]));

		const observer = new MutationObserver((records) => {
			const added = new Set(records.flatMap((r) => Array.from(r.addedNodes)));
			for (const node of records.flatMap((r) => Array.from(r.removedNodes))) {
				const last = boxes.get(node as HTMLElement);
				if (!(node instanceof HTMLElement) || added.has(node) || !last)
					continue;
				fadeOutGhost(node, last, list);
			}
			for (const el of rows()) slideRow(el, boxes.get(el));
			boxes = new Map(rows().map((el) => [el, boxOf(el)]));
		});
		observer.observe(list, { childList: true });
		return () => observer.disconnect();
	}, []);

	return (
		<div ref={wrap} className="lv-panel ss-fade-b">
			{children}
		</div>
	);
};

const modeTab = (label: string) =>
	find('[aria-label="Arrange children"] button', label);
const spot = (label: string) => find(`[aria-label="${label}"]`);

const writeGap = (px: number) =>
	store.dispatch?.({
		type: "UPDATE_LAYER_CSS",
		payload: { id: "f", css: { "--column-gap": `${px}px` } },
	});

async function script(a: Act<S>) {
	countLoop();
	// Back to the first frame's values. The loop ends on Default, where none
	// of these show, so nothing on screen moves
	store.dispatch?.({
		type: "UPDATE_LAYER_CSS",
		payload: {
			id: "f",
			css: {
				"--display": "",
				"--flex-direction": "",
				"--justify-content": "",
				"--align-items": "",
				"--column-gap": `${GAP_FROM}px`,
			},
		},
	});
	await a.wait(900);

	a.mark("row");
	await press(a, "mode-row", modeTab("Row"));
	await a.wait(1100);

	a.mark("center");
	await press(a, "spot", spot("Middle center"));
	await a.wait(1000);

	a.mark("gap");
	const gap = find('input[aria-label="Gap"]');
	tag("gap", gap);
	await a.move({ at: "gap", x: 0.25, y: 0.5 });
	bridge.flip = false;
	await a.drag(
		{ at: "gap", x: 0.85, y: 0.5 },
		(_at, _from, t) => writeGap(Math.round(GAP_FROM + (GAP_TO - GAP_FROM) * t)),
		{ duration: 1100 }
	);
	writeGap(GAP_TO);
	bridge.flip = true;
	await a.wait(1600);

	a.mark("column");
	await press(a, "mode-column", modeTab("Column"));
	await a.wait(1800);

	a.mark("default");
	await press(a, "mode-default", modeTab("Default"));
	await a.wait(700);
	await a.move(REST);
	await a.wait(500);
}

export const LayoutVideo = () => (
	<Stage
		width={480}
		height={600}
		initial={initial}
		poster={poster}
		script={script}
		play="loop"
		cursor={{ at: REST, style: "large", idle: false }}
		className="lv"
	>
		{(s) => (
			<div className="lv-zoom ss-native">
				<Sandbox key={s.pose} layers={layersFor(s.pose)} selectedId="f">
					<StoreBridge />
					<div className="lv-stack">
						<Canvas />
						<PanelMotion>
							<DesignerPane
								title="Layout"
								category="layout"
								icon={<IconLayoutGrid />}
							>
								<ActionLayout />
							</DesignerPane>
						</PanelMotion>
					</div>
				</Sandbox>
			</div>
		)}
	</Stage>
);
