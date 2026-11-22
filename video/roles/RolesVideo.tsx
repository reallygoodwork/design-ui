import {
	allowed,
	checkAction,
	type Layer,
	normalize,
	type Rule,
	type RulesContext,
} from "@design-ui/core";
import { IconLock } from "@tabler/icons-react";
import { type Act, Camera, type Rect, Segmented, Stage, Window } from "../kit";
import { countLoop } from "../shared";
import "../agent/agent.css";
import "./roles.css";

// One page handed from a builder to an editor. The builder changes the
// title's size; the role switches; the same controls lock, except color;
// the editor rewrites the words, and a size change is refused. What locks
// and what the refusal says come from the rules engine in @design-ui/core.

// ---------------------------------------------------------------------------
// The rule, and what it means for each role

const layers: Layer[] = [
	{
		id: "card",
		name: "Card",
		type: "frame",
		value: "",
		children: [
			{ id: "title", name: "Title", type: "text", value: "Spring sale" },
		],
	},
];

const rules: Rule[] = [
	{
		id: "title-style",
		target: { layerIds: ["title"] },
		editableProperties: ["group:color"],
		message: "The title's style comes from the design system",
	},
];

const ctx: RulesContext = { ...normalize(layers), breakpoints: [], rules };

const resize = {
	type: "UPDATE_LAYER_CSS",
	payload: { id: "title", css: { "--font-size": "32px" } },
} as const;
const rewrite = {
	type: "UPDATE_LAYER_VALUE",
	payload: { id: "title", value: "Summer is here" },
} as const;

const builderMayResize = checkAction(ctx, resize, "builder") === null;
const editorMayRewrite = checkAction(ctx, rewrite, "editor") === null;
const refusal = checkAction(ctx, resize, "editor");
const editable = allowed(ctx, "title", "editor").editableProperties;
if (!builderMayResize || !editorMayRewrite || !refusal || !editable)
	console.error("The rule no longer tells this story");

/** Whether an editor may change this property of the title. */
const editorMay = (property: string) =>
	!editable || editable.includes(property);

// ---------------------------------------------------------------------------
// The story

const CAPTIONS = [
	"Builders can change anything.",
	"Hand the page to an editor.",
	"The words are theirs to change.",
	"The design system keeps the rest.",
	"Hand off a page, not the keys.",
];

type Role = "builder" | "editor";

type S = {
	caption: number;
	role: Role;
	selected: boolean;
	size: number;
	title: string;
	allSelected: boolean;
	editing: boolean;
	blocked: boolean;
	focus: Rect | null;
	dim: boolean;
};

const initial: S = {
	caption: 0,
	role: "builder",
	selected: false,
	size: 24,
	title: "Spring sale",
	allSelected: false,
	editing: false,
	blocked: false,
	focus: null,
	dim: false,
};

const poster: S = {
	...initial,
	caption: CAPTIONS.length - 1,
	role: "editor",
	selected: true,
	size: 30,
	title: "Summer is here",
};

const REST = { x: 300, y: 560 };

const CAPTION_ROOM = 130;
const HEADROOM = 48;
const focusOn = (a: Act<S>, name: string): Rect => {
	const r = a.rect(name, { layout: true });
	return {
		...r,
		y: r.y - HEADROOM,
		height: r.height + HEADROOM + CAPTION_ROOM,
	};
};

/** A shot holding several targets: a control and what it changes. */
const focusAll = (a: Act<S>, ...names: string[]): Rect => {
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

	// 1. As a builder: select the title, make it bigger
	a.mark("builder");
	await a.click({ at: "title" });
	await a.set({ selected: true });
	await a.wait(400);
	await a.set({ focus: focusAll(a, "title", "inspector-type") });
	await a.wait(500);
	await a.move({ at: "size", x: 0.4, y: 0.5 });
	await a.drag(
		{ at: "size", x: 0.75, y: 0.5 },
		(_at, _from, t) => {
			void a.set({ size: Math.round(24 + 6 * t) });
		},
		{ duration: 900 }
	);
	await a.set({ size: 30 });
	await a.wait(700);

	// 2. Hand it over
	a.mark("handoff");
	await a.set({ caption: 1, focus: focusOn(a, "toolbar-roles") });
	await a.wait(300);
	await a.click({ at: "role-editor" });
	await a.set({ role: "editor" });
	await a.wait(500);
	await a.set({ focus: focusAll(a, "inspector-head", "inspector-color") });
	await a.wait(1500);

	// 3. The words: allowed
	a.mark("words");
	await a.set({ caption: 2, focus: focusOn(a, "artboard") });
	await a.wait(300);
	await a.click({ at: "title" }, { double: true });
	await a.set({ editing: true, allSelected: true });
	await a.wait(400);
	await a.set({ allSelected: false, title: "" });
	await a.type("title", "Summer is here", { interval: 55 });
	await a.wait(300);
	await a.set({ editing: false });
	await a.wait(900);

	// 4. The size: refused
	a.mark("size");
	await a.set({ caption: 3, focus: focusOn(a, "inspector-type") });
	await a.wait(400);
	await a.move({ at: "size", x: 0.4, y: 0.5 });
	await a.drag({ at: "size", x: 0.75, y: 0.5 }, () => {}, { duration: 700 });
	await a.set({ blocked: true });
	await a.wait(2200);
	await a.set({ blocked: false });

	// 5. Pull back
	a.mark("payoff");
	void a.move(REST);
	await a.set({ caption: 4, focus: null });
	await a.wait(3000);

	await a.set({ dim: true });
	await a.wait(500);
	await a.snap({ ...initial, dim: true });
	await a.wait(120);
	await a.set({ dim: false });
	await a.wait(400);
}

// ---------------------------------------------------------------------------
// The picture

type Field = {
	label: string;
	property: string;
	value: string;
	target?: string;
};

const TYPE_FIELDS = (s: S): Field[] => [
	{
		label: "Size",
		property: "--font-size",
		value: `${s.size}`,
		target: "size",
	},
	{ label: "Weight", property: "--font-weight", value: "Semibold" },
	{ label: "Line height", property: "--line-height", value: "1.1" },
	{ label: "Letter spacing", property: "--letter-spacing", value: "-2%" },
];

const Row = ({ s, field }: { s: S; field: Field }) => {
	const locked = s.role === "editor" && !editorMay(field.property);
	return (
		<div className="rv-row" data-locked={locked || undefined}>
			<span className="rv-row__label">{field.label}</span>
			<span
				className="rv-field"
				data-target={field.target}
				data-cursor={locked ? "default" : "resize-ew"}
				data-blocked={(field.target === "size" && s.blocked) || undefined}
			>
				<span className="rv-field__value">{field.value}</span>
				{field.target === "size" && <span className="rv-field__unit">px</span>}
				<IconLock className="rv-field__lock" size={11} stroke={2} />
			</span>
		</div>
	);
};

const Inspector = ({ s }: { s: S }) => (
	<aside className="rv-inspector">
		<div className="rv-inspector__head" data-target="inspector-head">
			<span>Title</span>
			<span className="rv-kind">Text</span>
		</div>
		<div
			className="rv-banner"
			data-on={(s.role === "editor" && s.selected) || undefined}
		>
			<IconLock size={12} stroke={2} />
			Rules limit what can change here
		</div>
		<div className="rv-section">
			<span className="rv-section__title">Content</span>
			<div className="rv-text">
				{s.title}
				{s.editing && <i className="rv-text__caret" />}
			</div>
		</div>
		<div className="rv-section" data-target="inspector-type">
			<span className="rv-section__title">Typography</span>
			{TYPE_FIELDS(s).map((field) => (
				<Row key={field.label} s={s} field={field} />
			))}
			<div className="rv-refusal" data-show={s.blocked || undefined}>
				<span className="rv-refusal__head">
					<IconLock size={12} stroke={2} />
					Blocked by <code>{refusal?.ruleId}</code>
				</span>
				<span className="rv-refusal__msg">{refusal?.message}</span>
			</div>
		</div>
		<div className="rv-section" data-target="inspector-color">
			<span className="rv-section__title">Color</span>
			<div
				className="rv-row"
				data-locked={
					(s.role === "editor" && !editorMay("--color")) || undefined
				}
			>
				<span className="rv-row__label">Text</span>
				<span className="rv-field">
					<i className="rv-swatch" />
					<span className="rv-field__value">brand.ink</span>
					<IconLock className="rv-field__lock" size={11} stroke={2} />
				</span>
			</div>
		</div>
		<div className="rv-section">
			<span className="rv-section__title">Layout</span>
			{(["Width", "Padding"] as const).map((label) => (
				<div
					key={label}
					className="rv-row"
					data-locked={s.role === "editor" || undefined}
				>
					<span className="rv-row__label">{label}</span>
					<span className="rv-field">
						<span className="rv-field__value">
							{label === "Width" ? "Fill" : "0"}
						</span>
						<IconLock className="rv-field__lock" size={11} stroke={2} />
					</span>
				</div>
			))}
		</div>
	</aside>
);

const Editor = ({ s }: { s: S }) => (
	<div className="av-editor">
		<div className="av-toolbar rv-toolbar">
			<span className="av-crumb">
				Spring sale <span>/</span> Mobile
			</span>
			<span className="rv-roles" data-target="toolbar-roles">
				<span className="rv-roles__label">Edit as</span>
				<Segmented
					items={["Builder", "Editor"]}
					value={s.role === "builder" ? 0 : 1}
					targets={["role-builder", "role-editor"]}
					cursor="pointer"
					className="rv-seg"
				/>
			</span>
			<span className="av-pill">
				<IconLock size={12} stroke={1.8} /> 1 rule
			</span>
		</div>
		<div className="av-main rv-main">
			<div className="av-canvas">
				<div className="av-artboard rv-artboard" data-target="artboard">
					<span className="av-frame-label">Mobile · 375</span>
					<span className="av-eyebrow">New</span>
					<div
						className="av-layer rv-title-layer"
						data-target="title"
						data-cursor="pointer"
						data-selected={s.selected || undefined}
					>
						<h1
							className="av-title rv-title"
							data-all={s.allSelected || undefined}
							style={{ fontSize: s.size }}
						>
							{s.title}
							{s.editing && <i className="rv-title__caret" />}
						</h1>
					</div>
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
			<Inspector s={s} />
		</div>
	</div>
);

export const RolesVideo = () => (
	<Stage
		width={600}
		height={750}
		initial={initial}
		poster={poster}
		script={script}
		play="loop"
		theme="dark"
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
