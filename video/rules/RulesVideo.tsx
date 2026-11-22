import {
	checkAction,
	type Layer,
	normalize,
	type RulesContext,
	updateLayerRule,
} from "@design-ui/core";
import { IconCheck, IconEye, IconLock } from "@tabler/icons-react";
import { type Act, Camera, type Rect, Segmented, Stage, Window } from "../kit";
import { countLoop } from "../shared";
import "../agent/agent.css";
import "../roles/roles.css";
import "./rules.css";

// A builder sets two rules on a card from the Rules tab, previews the editor,
// and a hex color is refused; two undos take the rules back off. The rules
// are made the way the Rules tab makes them (updateLayerRule), and the
// refusal is the engine's own.

// ---------------------------------------------------------------------------
// The rules, made as the Rules tab makes them

const layers: Layer[] = [
	{
		id: "card",
		name: "Card",
		type: "frame",
		value: "",
		children: [{ id: "title", name: "Title", type: "text", value: "" }],
	},
];

const rules = updateLayerRule(
	updateLayerRule([], "card", (r) => ({ ...r, structure: { locked: true } })),
	"card",
	(r) => ({ ...r, values: { "group:color": { tokensOnly: true } } })
);
const ctx: RulesContext = { ...normalize(layers), breakpoints: [], rules };
const hex = checkAction(
	ctx,
	{
		type: "UPDATE_LAYER_CSS",
		payload: { id: "card", css: { "--background-color": "#ff0000" } },
	},
	"editor"
);
const token = checkAction(
	ctx,
	{
		type: "UPDATE_LAYER_CSS",
		payload: { id: "card", css: { "--background-color": "var(--surface)" } },
	},
	"editor"
);
if (!hex || token) console.error("The rules no longer tell this story");

// ---------------------------------------------------------------------------
// The story

const CAPTIONS = [
	"Set rules where you design.",
	"Lock the layout.",
	"Allow only brand colors.",
	"See what editors will get.",
	"Rule changes undo like any edit.",
	"Brand guardrails. No JSON.",
];

type S = {
	caption: number;
	selected: boolean;
	tab: "styles" | "rules";
	locked: boolean;
	tokensOnly: boolean;
	preview: boolean;
	fill: string;
	editing: boolean;
	blocked: boolean;
	focus: Rect | null;
	dim: boolean;
};

const initial: S = {
	caption: 0,
	selected: false,
	tab: "styles",
	locked: false,
	tokensOnly: false,
	preview: false,
	fill: "#FFFFFF",
	editing: false,
	blocked: false,
	focus: null,
	dim: false,
};

const poster: S = {
	...initial,
	caption: 3,
	selected: true,
	tab: "styles",
	locked: true,
	tokensOnly: true,
	preview: true,
	blocked: true,
};

const REST = { x: 300, y: 560 };

const CAPTION_ROOM = 130;
const HEADROOM = 48;
const focusOn = (a: Act<S>, ...names: string[]): Rect => {
	const rs = names.map((n) => a.rect(n, { layout: true }));
	const x = Math.min(...rs.map((r) => r.x));
	const y = Math.min(...rs.map((r) => r.y));
	const right = Math.max(...rs.map((r) => r.x + r.width));
	const bottom = Math.max(...rs.map((r) => r.y + r.height));
	return {
		x,
		y: y - HEADROOM,
		width: right - x,
		height: bottom - y + HEADROOM + CAPTION_ROOM,
	};
};

async function script(a: Act<S>) {
	countLoop();
	await a.wait(700);

	// 1. Select the card, open Rules
	a.mark("open");
	await a.click({ at: "card" });
	await a.set({ selected: true });
	await a.wait(300);
	await a.set({ focus: focusOn(a, "inspector-tabs", "rules-panel") });
	await a.wait(400);
	await a.click({ at: "tab-rules" });
	await a.set({ tab: "rules" });
	await a.wait(700);

	// 2. Lock the layout
	a.mark("lock");
	await a.set({ caption: 1 });
	await a.click({ at: "check-lock" });
	await a.set({ locked: true });
	await a.wait(900);

	// 3. Brand colors only
	a.mark("tokens");
	await a.set({ caption: 2 });
	await a.click({ at: "check-color" });
	await a.set({ tokensOnly: true });
	await a.wait(1000);

	// 4. Preview as an editor, and try a hex color
	a.mark("preview");
	await a.set({ caption: 3, focus: focusOn(a, "toolbar-preview") });
	await a.wait(400);
	await a.click({ at: "preview" });
	await a.set({ preview: true, tab: "styles" });
	await a.wait(500);
	await a.set({ focus: focusOn(a, "fill") });
	await a.wait(500);
	await a.click({ at: "fill-field" });
	await a.set({ editing: true, fill: "" });
	await a.type("fill", "#FF0000", { interval: 70 });
	await a.key("enter");
	await a.set({ blocked: true, editing: false, fill: "#FFFFFF" });
	await a.wait(2300);
	await a.set({ blocked: false });

	// 5. Out of preview; undo the two rules
	a.mark("undo");
	await a.set({ caption: 4, focus: focusOn(a, "toolbar-preview") });
	await a.wait(300);
	await a.click({ at: "preview" });
	await a.set({ preview: false, tab: "rules" });
	await a.set({ focus: focusOn(a, "inspector-tabs", "rules-panel") });
	await a.wait(700);
	await a.key("cmd+z");
	await a.set({ tokensOnly: false });
	await a.wait(600);
	await a.key("cmd+z");
	await a.set({ locked: false });
	await a.wait(800);

	// 6. Pull back
	a.mark("payoff");
	void a.move(REST);
	await a.set({ caption: 5, focus: null });
	await a.wait(2600);

	await a.set({ dim: true });
	await a.wait(500);
	await a.snap({ ...initial, dim: true });
	await a.wait(120);
	await a.set({ dim: false });
	await a.wait(400);
}

// ---------------------------------------------------------------------------
// The picture

const Check = ({
	on,
	label,
	hint,
	target,
}: {
	on: boolean;
	label: string;
	hint?: string;
	target?: string;
}) => (
	<div className="rl-check" data-target={target} data-cursor="pointer">
		<span className="rl-check__box" data-on={on || undefined}>
			<IconCheck size={11} stroke={3} />
		</span>
		<span className="rl-check__text">
			{label}
			{hint && <span className="rl-check__hint">{hint}</span>}
		</span>
	</div>
);

const RulesPanel = ({ s }: { s: S }) => (
	<div className="rl-panel" data-target="rules-panel">
		<p className="rl-intro">
			What editors and agents can change on <b>Card</b>.
		</p>
		<div className="rv-section">
			<span className="rv-section__title">Structure</span>
			<Check
				on={s.locked}
				label="Lock structure"
				hint="No adding, removing or moving layers inside"
				target="check-lock"
			/>
		</div>
		<div className="rv-section">
			<span className="rv-section__title">Tokens only</span>
			<Check on={s.tokensOnly} label="Color" target="check-color" />
			<Check on={false} label="Typography" />
			<Check on={false} label="Spacing" />
		</div>
	</div>
);

const StylesPanel = ({ s }: { s: S }) => (
	<div className="rl-panel">
		<div className="rv-banner" data-on={(s.preview && s.selected) || undefined}>
			<IconLock size={12} stroke={2} />
			Rules limit what can change here
		</div>
		<div className="rv-section" data-target="fill">
			<span className="rv-section__title">Fill</span>
			<div className="rv-row">
				<span className="rv-row__label">Background</span>
				<span
					className="rv-field rl-fill"
					data-target="fill-field"
					data-cursor="ibeam"
					data-editing={s.editing || undefined}
					data-blocked={s.blocked || undefined}
				>
					<i className="rv-swatch rl-swatch" />
					<span className="rv-field__value">
						{s.fill}
						{s.editing && <i className="rv-text__caret" />}
					</span>
				</span>
			</div>
			<div className="rv-refusal rl-refusal" data-show={s.blocked || undefined}>
				<span className="rv-refusal__head">
					<IconLock size={12} stroke={2} />
					Blocked by <code>{hex?.ruleId}</code>
				</span>
				<span className="rv-refusal__msg">{hex?.message}</span>
			</div>
		</div>
		<div className="rv-section">
			<span className="rv-section__title">Layout</span>
			{(["Direction", "Gap", "Padding"] as const).map((label) => (
				<div key={label} className="rv-row">
					<span className="rv-row__label">{label}</span>
					<span className="rv-field">
						<span className="rv-field__value">
							{label === "Direction" ? "Column" : label === "Gap" ? "12" : "20"}
						</span>
					</span>
				</div>
			))}
		</div>
	</div>
);

const Editor = ({ s }: { s: S }) => (
	<div className="av-editor">
		<div className="av-toolbar">
			<span className="av-crumb">
				Spring sale <span>/</span> Mobile
			</span>
			<span
				className="rl-preview"
				data-target="toolbar-preview"
				data-on={s.preview || undefined}
			>
				<span
					data-target="preview"
					data-cursor="pointer"
					className="rl-preview__btn"
				>
					<IconEye size={13} stroke={1.8} />
					{s.preview ? "Exit editor preview" : "Editor preview"}
				</span>
			</span>
		</div>
		<div className="av-main rv-main">
			<div className="av-canvas">
				<div
					className="av-artboard rv-artboard av-layer rl-card"
					data-target="card"
					data-cursor="pointer"
					data-selected={s.selected || undefined}
				>
					<span
						className="av-frame-label rl-card-label"
						data-target="card-label"
					>
						Card
						<IconLock
							className="rl-card-lock"
							data-on={s.locked || undefined}
							size={11}
							stroke={2}
						/>
					</span>
					<span className="av-eyebrow">New</span>
					<h1 className="av-title rl-title">Spring sale</h1>
					<div className="av-lines">
						<i style={{ width: "94%" }} />
						<i style={{ width: "68%" }} />
					</div>
					<div className="av-image" />
					<div className="av-button-area">
						<div className="av-button">Shop the sale</div>
					</div>
				</div>
			</div>
			<aside className="rv-inspector">
				<div className="rl-tabs" data-target="inspector-tabs">
					<Segmented
						items={s.preview ? ["Styles", "CSS"] : ["Styles", "Rules"]}
						value={s.tab === "rules" ? 1 : 0}
						targets={[undefined, "tab-rules"]}
						cursor="pointer"
					/>
				</div>
				<div className="rl-panels" data-tab={s.tab}>
					<StylesPanel s={s} />
					<RulesPanel s={s} />
				</div>
			</aside>
		</div>
	</div>
);

export const RulesVideo = () => (
	<Stage
		width={600}
		height={750}
		initial={initial}
		poster={poster}
		script={script}
		play="loop"
		theme="dark"
		keys="top"
		cursor={{ at: REST, style: "real" }}
		className="av-stage rv"
	>
		{(s) => (
			<div className="av" data-dim={s.dim || undefined}>
				<Camera focus={s.focus} max={1.65} pad={24} duration={1100} feather={0}>
					<div className="av-scene">
						<div className="av-wallpaper" />
						<Window className="av-window rv-window">
							<Editor s={s} />
						</Window>
					</div>
				</Camera>
				<div className="av-caption">
					<div className="av-caption__text">
						{CAPTIONS.map((line, i) => (
							<span key={line} data-on={s.caption === i || undefined}>
								{line}
							</span>
						))}
					</div>
				</div>
			</div>
		)}
	</Stage>
);
