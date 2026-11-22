import type { Layer } from "@design-ui/react";
import {
	ActionFontSize,
	ActionFontWeight,
	ActionLetterSpacing,
	ActionLineHeight,
	DesignerPane,
} from "@design-ui/react";
import { IconTypography } from "@tabler/icons-react";
import { LayerStage, Sandbox } from "../../src/docs/Sandbox";
import { type Act, Stage } from "../kit";
import {
	countLoop,
	find,
	PortalHome,
	pointer,
	press,
	StoreBridge,
	tag,
	toClient,
} from "../shared";
import "./scrub-field.css";

// A close-up of one real number field, the headline it sizes above it.
//
// Beats: hover (the scrub handle shows), drag from 20px to 48px, switch the
// unit to rem (3rem: the headline keeps its size), drag in rem (it steps in
// tenths), then click to type "20px" and Enter (typing a unit switches it
// back). That is the first frame.
//
// The field gets real pointer events, so the drag, the threshold before a
// drag counts, the snapping and the click-to-type are the field's own.

type Pose = "start" | "poster";
type S = { pose: Pose };

const initial: S = { pose: "start" };
const poster: S = { pose: "poster" };
const REST = { x: 316, y: 424 };

const START = 20;
const BIG = 48;
const REM_TO = 2;
const PX_SCALE = 120; // ActionFontSize's full fill, in px
const REM_SCALE = 10; // UnitField's default full fill, in rem
const REM_STEP = 0.1;

const layersFor = (pose: Pose): Layer[] => [
	{
		id: "title",
		type: "text",
		name: "Title",
		value: "Launch day",
		cssVars: {
			"--font-size": `${pose === "poster" ? BIG : START}px`,
			"--font-weight": "600",
			"--letter-spacing": "-0.02em",
			"--line-height": "1.1",
			"--color": "#18181b",
		},
	},
];

const sizeField = () =>
	find('input[aria-label="Size"]')?.closest<HTMLElement>(
		"[data-slot=scrub-field]"
	) ?? undefined;

/**
 * Drag across the field by `dx` stage pixels with real pointer events, the
 * stage's cursor drawn along the same path.
 */
const scrub = async (a: Act<S>, field: HTMLElement, dx: number) => {
	tag("size", field);
	const from = a.center("size");
	const start = { x: from.x - dx / 2, y: from.y };
	await a.move(start);
	await a.wait(450);
	pointer(field, "pointerdown", toClient(start));
	await a.drag(
		{ x: start.x + dx, y: start.y },
		(at) => pointer(field, "pointermove", toClient(at)),
		{ duration: 1300 }
	);
	pointer(field, "pointerup", toClient({ x: start.x + dx, y: start.y }));
};

/** The field's value per pixel of drag, as ScrubField works it out. */
const perPixel = (field: HTMLElement, scale: number, step: number) =>
	Math.min(scale / field.clientWidth, step * 2);

/**
 * Type into the focused field at a person's pace, one real input event per
 * key. The field shows the text as it grows; keycaps (a third of a second
 * each) would type slower than anyone does, and a field waits for a pause
 * before applying a typed number.
 */
const TYPING_MS = 120;
const typeInto = async (a: Act<S>, input: HTMLInputElement, text: string) => {
	const setValue = Object.getOwnPropertyDescriptor(
		HTMLInputElement.prototype,
		"value"
	)?.set;
	for (let i = 1; i <= text.length; i++) {
		await a.wait(TYPING_MS);
		setValue?.call(input, text.slice(0, i));
		input.dispatchEvent(new Event("input", { bubbles: true }));
	}
};

async function script(a: Act<S>) {
	countLoop();
	await a.wait(700);

	a.mark("scrub-px");
	const field = sizeField();
	if (!field) return;
	await scrub(a, field, (BIG - START) / perPixel(field, PX_SCALE, 1));
	await a.wait(900);

	a.mark("unit");
	await press(a, "unit", find('[aria-label="Size unit"]'));
	await a.wait(500);
	await press(a, "rem", find('[role="option"]', "rem"));
	await a.wait(300);
	// The menu hands focus back to its trigger; nobody pressed a key
	(document.activeElement as HTMLElement | null)?.blur();
	await a.wait(1000);

	a.mark("scrub-rem");
	const remField = sizeField();
	if (!remField) return;
	await scrub(
		a,
		remField,
		-(BIG / 16 - REM_TO) / perPixel(remField, REM_SCALE, REM_STEP)
	);
	await a.wait(900);

	a.mark("type");
	const typeField = sizeField();
	const input = typeField?.querySelector("input");
	if (!typeField || !input) return;
	tag("size", typeField);
	const at = a.center("size");
	await a.click(at);
	pointer(typeField, "pointerdown", toClient(at));
	pointer(typeField, "pointerup", toClient(at));
	await a.wait(300);
	await typeInto(a, input, `${START}px`);
	await a.key("enter");
	input.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
	);
	input.blur();
	await a.wait(800);
	await a.move(REST);
	await a.wait(500);
}

export const ScrubFieldVideo = () => (
	<Stage
		width={360}
		height={450}
		initial={initial}
		poster={poster}
		script={script}
		play="loop"
		cursor={{ at: REST, style: "large", idle: false }}
		keys="bottom-left"
		className="sf"
	>
		{(s) => (
			<PortalHome className="sf-scene">
				<Sandbox key={s.pose} layers={layersFor(s.pose)} selectedId="title">
					<StoreBridge />
					<div className="sf-page">
						<LayerStage className="sf-title" />
					</div>
					<div className="sf-panel">
						<DesignerPane
							title="Typography"
							category="type"
							icon={<IconTypography />}
						>
							<ActionFontSize />
							<ActionFontWeight />
							<ActionLineHeight />
							<ActionLetterSpacing />
						</DesignerPane>
					</div>
				</Sandbox>
			</PortalHome>
		)}
	</Stage>
);
