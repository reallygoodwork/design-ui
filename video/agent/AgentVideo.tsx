import {
	type Action,
	AGENT,
	createDesignerStore,
	initialState,
	type Layer,
	normalize,
	type Rule,
} from "@design-ui/core";
import {
	IconCheck,
	IconLock,
	IconPlugConnected,
	IconX,
} from "@tabler/icons-react";
import {
	type Act,
	Button,
	Camera,
	Collapse,
	type Rect,
	Roll,
	Stage,
	Window,
} from "../kit";
import { countLoop } from "../shared";
import "./agent.css";

// An agent working on a launch page, recorded the way a screen recorder
// frames it: the app on a quiet wallpaper, the camera pushing in on each
// moment. Three of the agent's changes are refused by the page's rules.
// The refusals are real: every message comes from the rules engine in
// @design-ui/core, checked as an agent.

// ---------------------------------------------------------------------------
// The page, its rules, and what the engine says about each attempt

const layers: Layer[] = [
	{
		id: "card",
		name: "Card",
		type: "frame",
		value: "",
		children: [
			{
				id: "title",
				name: "Title",
				type: "text",
				value: "Spring sale",
				cssVars: { "--font-size": "24px" },
			},
			{ id: "image", name: "Image", type: "image", value: "" },
			{
				id: "button",
				name: "Button",
				type: "text",
				value: "Join the waitlist",
			},
		],
	},
];

const rules: Rule[] = [
	{
		id: "title-size",
		target: { layerIds: ["title"] },
		values: { "--font-size": { min: 16, max: 32, unit: "px" } },
	},
	{
		id: "brand-colors",
		target: {},
		values: { "group:color": { tokensOnly: true } },
	},
	{
		id: "card-layout",
		target: { layerIds: ["card"] },
		structure: { locked: true },
		message: "The card's layout is fixed",
	},
];

const engine = createDesignerStore({
	...initialState,
	...normalize(layers),
	layerTypes: [
		{
			type: "frame",
			name: "Frame",
			defaultValues: { name: "", value: "" },
			supportsChildren: true,
		},
		{ type: "text", name: "Text", defaultValues: { name: "", value: "" } },
		{ type: "image", name: "Image", defaultValues: { name: "", value: "" } },
	],
	rules,
});

/** Sends an action as the agent; the rejection, or null if it went through. */
const attempt = (action: Action) =>
	engine.dispatchWithMeta(action, { actor: AGENT });

const refused = {
	size: attempt({
		type: "UPDATE_LAYER_CSS",
		payload: { id: "title", css: { "--font-size": "48px" } },
	}),
	color: attempt({
		type: "UPDATE_LAYER_CSS",
		payload: { id: "button", css: { "--background-color": "#ff2d95" } },
	}),
	remove: attempt({
		type: "DELETE_LAYERS",
		payload: { layerIds: ["image"] },
	}),
};
const allowed = {
	words: attempt({
		type: "UPDATE_LAYER_VALUE",
		payload: { id: "title", value: "Spring is here" },
	}),
	token: attempt({
		type: "UPDATE_LAYER_CSS",
		payload: {
			id: "button",
			css: { "--background-color": "var(--brand-accent)" },
		},
	}),
};
if (
	allowed.words ||
	allowed.token ||
	!refused.size ||
	!refused.color ||
	!refused.remove
)
	console.error("The rules no longer tell this story", { refused, allowed });

type At = "title" | "button" | "image";
const said = (r: (typeof refused)[keyof typeof refused]) => ({
	rule: r?.ruleId ?? "",
	message: r?.message ?? "",
});
const REFUSAL: Record<At, { rule: string; message: string }> = {
	title: said(refused.size),
	button: said(refused.color),
	image: said(refused.remove),
};

// ---------------------------------------------------------------------------
// The story

const CAPTIONS = [
	"Give an agent a task.",
	"It edits the page, and says why.",
	"It can't break your type scale.",
	"Or go off brand.",
	"It uses your tokens instead.",
	"Or change a locked layout.",
	"Agents edit. Your rules hold.",
];

type Entry = { ok: boolean; title: string; note: string };
const ENTRIES: Entry[] = [
	{ ok: true, title: "Title text", note: "A clearer headline" },
	{ ok: false, title: "Title size 48px", note: REFUSAL.title.message },
	{ ok: false, title: "Button #FF2D95", note: REFUSAL.button.message },
	{ ok: true, title: "Button brand.accent", note: "On brand, more contrast" },
	{ ok: false, title: "Delete Image", note: REFUSAL.image.message },
];

type S = {
	caption: number;
	task: string;
	writing: boolean;
	sent: boolean;
	agent: { x: number; y: number; on: boolean };
	press: number;
	select: At | null;
	title: string;
	bigger: boolean;
	button: "ink" | "pink" | "accent";
	tokens: boolean;
	removing: boolean;
	blocked: At | null;
	shown: number;
	focus: Rect | null;
	dim: boolean;
};

const TASK = "Make the launch page stand out";
const OFFSTAGE = { x: 640, y: 420 };
const RESTING = { x: 520, y: 330 };

const initial: S = {
	caption: 0,
	task: "",
	writing: false,
	sent: false,
	agent: { ...OFFSTAGE, on: false },
	press: 0,
	select: null,
	title: "Spring sale",
	bigger: false,
	button: "ink",
	tokens: false,
	removing: false,
	blocked: null,
	shown: 0,
	focus: null,
	dim: false,
};

// The still that tells it all: the log full, the page intact
const poster: S = {
	...initial,
	caption: CAPTIONS.length - 1,
	task: TASK,
	sent: true,
	agent: { ...RESTING, on: true },
	title: "Spring is here",
	button: "accent",
	shown: ENTRIES.length,
};

const REST = { x: 470, y: 560 };

/** A push-in that keeps the caption's band, at the foot, clear of the target. */
const CAPTION_ROOM = 130;
const HEADROOM = 56;
const focusOn = (a: Act<S>, name: string): Rect => {
	const r = a.rect(name, { layout: true });
	return {
		...r,
		y: r.y - HEADROOM,
		height: r.height + HEADROOM + CAPTION_ROOM,
	};
};

const aim = (a: Act<S>, name: string, x: number, y: number) => {
	const r = a.rect(name, { layout: true });
	return { x: r.x + r.width * x, y: r.y + r.height * y };
};

async function agentTo(a: Act<S>, name: string, x = 0.85, y = 0.6) {
	await a.set((s) => ({ agent: { ...aim(a, name, x, y), on: s.agent.on } }));
	await a.wait(760);
}

/** After acting, the agent steps aside, so what happens next is in the clear. */
async function agentAside(a: Act<S>, name: string) {
	const page = a.rect("artboard", { layout: true });
	const r = a.rect(name, { layout: true });
	await a.set((s) => ({
		agent: { x: page.x + page.width + 8, y: r.y - 6, on: s.agent.on },
	}));
}

async function agentPress(a: Act<S>) {
	await a.set((s) => ({ press: s.press + 1 }));
	await a.wait(240);
}

async function script(a: Act<S>) {
	countLoop();
	await a.wait(800);

	// 1. A task for the agent
	a.mark("task");
	await a.set({ focus: focusOn(a, "task") });
	await a.move({ at: "composer" });
	await a.click();
	await a.set({ writing: true });
	await a.type("task", TASK, { interval: 38 });
	await a.wait(200);
	await a.click({ at: "assign" });
	await a.set({ sent: true, writing: false });
	await a.wait(600);
	void a.move(REST);

	// 2. New words: allowed, and logged with a reason
	a.mark("words");
	await a.set({
		caption: 1,
		focus: focusOn(a, "artboard"),
		agent: { ...OFFSTAGE, on: true },
	});
	await a.wait(300);
	await agentTo(a, "title", 0.62, 0.95);
	await agentPress(a);
	await a.set({ select: "title" });
	await a.wait(200);
	await a.set({ title: "Spring is here", shown: 1 });
	await a.wait(1400);

	// 3. A bigger title: refused by the type scale
	a.mark("size");
	await a.set({ caption: 2, bigger: true });
	await a.wait(420);
	await a.set({ bigger: false, blocked: "title", shown: 2 });
	await a.wait(2000);
	await a.set({ blocked: null });

	// 4. An off-brand color, refused; then a brand token, allowed
	a.mark("color");
	await a.set({
		caption: 3,
		select: "button",
		focus: focusOn(a, "button-area"),
	});
	await agentTo(a, "button", 0.7, 0.7);
	await agentPress(a);
	await a.set({ button: "pink" });
	void agentAside(a, "button");
	await a.wait(380);
	await a.set({ button: "ink", blocked: "button", shown: 3 });
	await a.wait(1800);
	await a.set({ blocked: null, tokens: true, caption: 4 });
	await a.wait(400);
	await agentTo(a, "token-accent", 0.7, 0.6);
	await agentPress(a);
	await a.set({ button: "accent", shown: 4 });
	await a.wait(300);
	await a.set({ tokens: false });
	await a.wait(1100);

	// 5. Deleting a layer of a locked card: refused
	a.mark("remove");
	await a.set({ caption: 5, select: "image", focus: focusOn(a, "artboard") });
	await agentTo(a, "image", 0.66, 0.62);
	await agentPress(a);
	await a.set({ removing: true });
	void agentAside(a, "image");
	await a.wait(360);
	await a.set({ removing: false, blocked: "image", shown: 5 });
	await a.wait(2000);
	await a.set({ blocked: null, select: null });

	// 6. Pull back: the page intact, every attempt in the log
	a.mark("payoff");
	await a.set({ caption: 6, focus: null, agent: { ...RESTING, on: true } });
	await a.wait(3400);

	// The loop's cause: the recording fades out and starts again
	await a.set({ dim: true });
	await a.wait(500);
	await a.snap({ ...initial, dim: true });
	await a.wait(120);
	await a.set({ dim: false });
	await a.wait(400);
}

// ---------------------------------------------------------------------------
// The picture

const Refusal = ({ at, show }: { at: At; show: boolean }) => (
	<div className="av-refusal" data-at={at} data-show={show || undefined}>
		<span className="av-refusal__head">
			<IconLock size={12} stroke={2} />
			Blocked by <code>{REFUSAL[at].rule}</code>
		</span>
		<span className="av-refusal__msg">{REFUSAL[at].message}</span>
	</div>
);

const AgentPointer = ({ s }: { s: S }) => (
	<div
		className="av-agent"
		data-on={s.agent.on || undefined}
		style={{ transform: `translate(${s.agent.x}px, ${s.agent.y}px)` }}
	>
		<div
			className="av-agent__hand"
			data-press={s.press === 0 ? undefined : s.press % 2 ? "a" : "b"}
		>
			<svg viewBox="0 0 20 20" className="av-agent__arrow" aria-hidden="true">
				<path
					d="M3 2l13.5 7.6-5.9 1.4-3 5.6z"
					fill="#4c8dff"
					stroke="#fff"
					strokeWidth="1.4"
					strokeLinejoin="round"
				/>
			</svg>
			<span className="av-agent__tag">Agent</span>
		</div>
	</div>
);

const TOKENS = [
	["brand.ink", "#18181b"],
	["brand.accent", "#f76707"],
	["brand.sky", "#1c7ed6"],
];

const Activity = ({ s }: { s: S }) => (
	<aside className="av-activity">
		<div className="av-activity__head">Activity</div>
		<div className="av-task" data-target="task">
			<div className="av-task__who">
				<span className="av-avatar">D</span>
				<span>You</span>
				<span className="av-task__kind">
					<span data-on={!s.sent || undefined}>New task</span>
					<span data-on={s.sent || undefined}>For Agent</span>
				</span>
			</div>
			<div
				className="av-composer"
				data-target="composer"
				data-cursor="ibeam"
				data-writing={s.writing || undefined}
			>
				<span className="av-composer__text">
					{s.task}
					<i className="av-caret" />
				</span>
				<span className="av-composer__hint" data-on={!s.task || undefined}>
					Describe a task…
				</span>
			</div>
			<Button
				size="small"
				variant={s.sent ? "secondary" : "primary"}
				data-target="assign"
				data-cursor="pointer"
				className="av-assign"
			>
				{s.sent ? "Assigned" : "Assign to Agent"}
			</Button>
		</div>
		<div className="av-feed">
			{ENTRIES.map((entry, i) => (
				<Collapse key={entry.title} open={s.shown > i} reveal="drop">
					<div className="av-entry" data-ok={entry.ok || undefined}>
						<span className="av-entry__mark">
							{entry.ok ? (
								<IconCheck size={11} stroke={2.4} />
							) : (
								<IconX size={11} stroke={2.4} />
							)}
						</span>
						<span className="av-entry__text">
							<b>{entry.title}</b>
							<span>{entry.note}</span>
						</span>
					</div>
				</Collapse>
			))}
		</div>
	</aside>
);

const Page = ({ s }: { s: S }) => (
	<div className="av-canvas">
		<div className="av-artboard" data-target="artboard">
			<span className="av-frame-label">Mobile · 375</span>
			<span className="av-eyebrow">New</span>
			<div
				className="av-layer av-title-layer"
				data-target="title"
				data-selected={s.select === "title" || undefined}
				data-blocked={s.blocked === "title" || undefined}
			>
				<h1 className="av-title" data-bigger={s.bigger || undefined}>
					<Roll>{s.title}</Roll>
				</h1>
				<Refusal at="title" show={s.blocked === "title"} />
			</div>
			<div className="av-lines">
				<i style={{ width: "94%" }} />
				<i style={{ width: "68%" }} />
			</div>
			<div
				className="av-layer av-image"
				data-target="image"
				data-selected={s.select === "image" || undefined}
				data-blocked={s.blocked === "image" || undefined}
				data-removing={s.removing || undefined}
			>
				<Refusal at="image" show={s.blocked === "image"} />
			</div>
			<div className="av-button-area" data-target="button-area">
				<div
					className="av-layer av-button"
					data-target="button"
					data-color={s.button}
					data-selected={s.select === "button" || undefined}
					data-blocked={s.blocked === "button" || undefined}
				>
					Join the waitlist
				</div>
				<Refusal at="button" show={s.blocked === "button"} />
				<div className="av-tokens" data-show={s.tokens || undefined}>
					{TOKENS.map(([name, color]) => (
						<span
							key={name}
							className="av-token"
							data-target={name === "brand.accent" ? "token-accent" : undefined}
							data-picked={
								(s.button === "accent" && name === "brand.accent") || undefined
							}
						>
							<i style={{ background: color }} />
							{name}
						</span>
					))}
				</div>
			</div>
		</div>
	</div>
);

const Editor = ({ s }: { s: S }) => (
	<div className="av-editor">
		<div className="av-toolbar">
			<span className="av-crumb">
				Spring launch <span>/</span> Mobile
			</span>
			<span className="av-pill">
				Edit as <b>Editor</b>
			</span>
			<span className="av-pill">
				<IconLock size={12} stroke={1.8} /> 3 rules
			</span>
			<span className="av-connected">
				<IconPlugConnected size={13} stroke={1.8} /> Agent connected
			</span>
		</div>
		<div className="av-main">
			<Activity s={s} />
			<Page s={s} />
		</div>
	</div>
);

export const AgentVideo = () => (
	<Stage
		width={600}
		height={750}
		initial={initial}
		poster={poster}
		script={script}
		play="loop"
		theme="dark"
		cursor={{ at: REST, style: "real" }}
		className="av-stage"
	>
		{(s) => (
			<div className="av" data-dim={s.dim || undefined}>
				<Camera focus={s.focus} max={1.65} pad={24} duration={1100} feather={0}>
					<div className="av-scene">
						<div className="av-wallpaper" />
						<Window className="av-window">
							<Editor s={s} />
						</Window>
						<AgentPointer s={s} />
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
