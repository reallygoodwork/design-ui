import type { Breakpoint, Layer } from "@design-ui/react";
import {
	ActionBackgroundColor,
	ActionDisplay,
	ActionFlexDirection,
	ActionFontSize,
	ActionLayout,
	ActionPadding,
	ActionTransition,
	PaneLayerTree,
	useDesignerAction,
	useDesignerSelector,
} from "@design-ui/react";
import type { ReactNode } from "react";
import backgroundSource from "../../packages/react/src/components/actions/ActionBackgroundColor.tsx?raw";
import displaySelectSource from "../../packages/react/src/components/actions/ActionDisplay.tsx?raw";
import flexDirectionSource from "../../packages/react/src/components/actions/ActionFlexDirection.tsx?raw";
import fontSizeSource from "../../packages/react/src/components/actions/ActionFontSize.tsx?raw";
import { Anatomy } from "./Anatomy";
import { Code, displaySource } from "./Code";
import { EditorEmbed } from "./EditorEmbed";
import agentBridgeSource from "./examples/AgentBridge.tsx?raw";
import { BrandColors } from "./examples/BrandColors";
import brandColorsSource from "./examples/BrandColors.tsx?raw";
import { badgeLayerType } from "./examples/badgeLayerType";
import badgeSource from "./examples/badgeLayerType.tsx?raw";
import deliverySource from "./examples/Delivery.tsx?raw";
import quickstartSource from "./examples/Quickstart.tsx?raw";
import rulesSource from "./examples/rules.ts?raw";
import savedEditorSource from "./examples/SavedEditor.tsx?raw";
import { SpacingPopover } from "./examples/SpacingPopover";
import spacingSource from "./examples/SpacingPopover.tsx?raw";
import { WeightSlider } from "./examples/WeightSlider";
import weightSource from "./examples/WeightSlider.tsx?raw";
import { Hero } from "./Hero";
import { GITHUB_URL, type NavItem, Rail } from "./Rail";
import {
	ControlDemo,
	LayerStage,
	LiveJson,
	Sandbox,
	SegmentedButtons,
} from "./Sandbox";
import { ScriptedAgent } from "./ScriptedAgent";

const controlNav: NavItem[] = [
	{ id: "numeric", label: "Number and unit" },
	{ id: "slider", label: "Slider" },
	{ id: "toggle", label: "Toggle group" },
	{ id: "select", label: "Select" },
	{ id: "color", label: "Color" },
	{ id: "popover", label: "Popover" },
	{ id: "layout", label: "Layout" },
	{ id: "transition", label: "Transition" },
	{ id: "all-controls", label: "All 30 controls" },
];

const nav: NavItem[] = [
	{ id: "overview", label: "Overview" },
	{ id: "try", label: "Try it" },
	{ id: "install", label: "Install" },
	{
		id: "quickstart",
		label: "Quickstart",
		children: [{ id: "pieces", label: "The pieces" }],
	},
	{
		id: "format",
		label: "The format",
		children: [{ id: "breakpoints", label: "Breakpoints" }],
	},
	{
		id: "rules",
		label: "Rules",
		children: [{ id: "roles", label: "Builders and editors" }],
	},
	{
		id: "agents",
		label: "Agents",
		children: [
			{ id: "agents-live", label: "In an open editor" },
			{ id: "agents-file", label: "On a design file" },
			{ id: "agents-bridge", label: "Your own connection" },
		],
	},
	{
		id: "delivery",
		label: "Delivery",
		children: [
			{ id: "saving", label: "Saving" },
			{ id: "rendering", label: "React and HTML" },
		],
	},
	{
		id: "extend",
		label: "Extend",
		children: [
			{ id: "custom-layers", label: "Custom layers" },
			{ id: "custom-controls", label: "Custom controls" },
			{ id: "theming", label: "Theming" },
		],
	},
	{ id: "controls", label: "Controls", children: controlNav },
	{
		id: "api",
		label: "API reference",
		children: [
			{ id: "api-packages", label: "Packages" },
			{ id: "api-actions", label: "Actions" },
			{ id: "api-tools", label: "Agent tools" },
		],
	},
];

const P = ({ children }: { children: ReactNode }) => (
	<p className="max-w-[66ch] text-[17px] text-foreground/80 leading-[1.6]">
		{children}
	</p>
);

const C = ({ children }: { children: ReactNode }) => (
	<code className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{children}</code>
);

const Section = ({
	id,
	title,
	children,
}: {
	id: string;
	title: string;
	children: ReactNode;
}) => (
	<section
		id={id}
		data-section
		className="grid gap-5 border-border border-t py-14"
	>
		<h2 className="font-semibold text-[32px] leading-tight tracking-tight">
			{title}
		</h2>
		{children}
	</section>
);

const Sub = ({
	id,
	title,
	badge,
	children,
}: {
	id: string;
	title: string;
	badge?: string;
	children: ReactNode;
}) => (
	<div id={id} data-section className="grid gap-4 pt-8">
		<h3 className="flex flex-wrap items-center gap-3 font-semibold text-[21px] tracking-tight">
			{title}
			{badge && (
				<code className="rounded bg-muted px-1.5 py-0.5 font-normal text-muted-foreground text-xs tracking-normal">
					{badge}
				</code>
			)}
		</h3>
		{children}
	</div>
);

const tile = (id: string, label: string): Layer => ({
	id,
	type: "text",
	name: label,
	value: label,
	cssVars: {
		"--background-color": "#ffffff",
		"--color": "#18181b",
		"--padding-block-start": "12px",
		"--padding-block-end": "12px",
		"--padding-inline-start": "16px",
		"--padding-inline-end": "16px",
	},
});

const textLayer = (cssVars: Record<string, string>): Layer[] => [
	{
		id: "t",
		type: "text",
		name: "Text",
		value: "Tune me",
		cssVars: { "--font-size": "40px", ...cssVars },
	},
];

const rowFrame = (cssVars: Record<string, string>): Layer[] => [
	{
		id: "f",
		type: "frame",
		name: "Row",
		value: "",
		cssVars: {
			"--background-color": "#d8e2ff",
			"--padding-block-start": "12px",
			"--padding-block-end": "12px",
			"--padding-inline-start": "12px",
			"--padding-inline-end": "12px",
			"--column-gap": "8px",
			"--row-gap": "8px",
			...cssVars,
		},
		children: [tile("a", "One"), tile("b", "Two"), tile("c", "Three")],
	},
];

const card: Layer[] = [
	{
		id: "card",
		type: "frame",
		name: "Card",
		value: "",
		cssVars: {
			"--background-color": "#ffffff",
			"--padding-block-start": "24px",
			"--padding-block-end": "24px",
			"--padding-inline-start": "24px",
			"--padding-inline-end": "24px",
		},
		children: [
			{
				id: "title",
				type: "text",
				name: "Title",
				value: "Select me in the tree",
				cssVars: { "--font-size": "24px", "--color": "#18181b" },
			},
		],
	},
];

const responsiveBreakpoints: Breakpoint[] = [
	{
		id: "mobile",
		name: "Mobile",
		width: 320,
		height: 200,
		position: { x: 0, y: 0 },
	},
	{
		id: "tablet",
		name: "Tablet",
		width: 480,
		height: 200,
		position: { x: 0, y: 0 },
	},
	{
		id: "desktop",
		name: "Desktop",
		width: 640,
		height: 200,
		position: { x: 0, y: 0 },
	},
];

const responsiveLayer: Layer[] = [
	{
		id: "r",
		type: "text",
		name: "Heading",
		value: "One layer, three widths",
		cssVars: { "--font-size": "24px" },
		breakpointCssVars: { desktop: { "--font-size": "48px" } },
	},
];

const BreakpointDemo = () => {
	const dispatch = useDesignerAction();
	const activeId = useDesignerSelector((state) => state.activeBreakpointId);
	const breakpoints = useDesignerSelector((state) => state.breakpoints);
	const width =
		breakpoints.find((breakpoint) => breakpoint.id === activeId)?.width ?? 320;

	return (
		<div className="overflow-hidden rounded-lg border border-border">
			<div className="flex flex-wrap items-center justify-between gap-3 border-border border-b bg-background p-2">
				<SegmentedButtons
					label="Active breakpoint"
					options={breakpoints.map((breakpoint) => ({
						label: breakpoint.name,
						value: breakpoint.id,
					}))}
					value={activeId}
					onChange={(breakpointId) =>
						dispatch({
							type: "SET_ACTIVE_BREAKPOINT",
							payload: { breakpointId },
						})
					}
				/>
				<div className="w-56">
					<ActionFontSize />
				</div>
			</div>
			<div className="grid min-h-40 place-items-center overflow-hidden bg-muted p-6">
				<div
					className="max-w-full border border-border bg-white p-4 text-[#18181b] transition-[width] duration-200"
					style={{ width }}
				>
					<LayerStage />
				</div>
			</div>
		</div>
	);
};

type Row = [control: string, writes: string, builtWith: string];

const catalog: { pane: string; rows: Row[] }[] = [
	{
		pane: "Layer",
		rows: [
			["ActionSize", "--width, --height, min and max", "Number"],
			[
				"ActionPosition",
				"position, top, right, bottom, left",
				"Popover, Select",
			],
			["ActionOpacity", "--opacity", "Slider"],
			["ActionBorderRadius", "four corner radii", "Linked values"],
			["ActionTextContent", "the layer's value (text layers)", "Textarea"],
			["ActionElementType", "the layer's HTML tag", "Select"],
		],
	},
	{
		pane: "Layout",
		rows: [
			[
				"ActionLayout",
				"size, direction, alignment, gap, padding, margin",
				"Composite",
			],
			["ActionDisplay", "--display", "Select"],
			[
				"ActionGridLayout",
				"--grid-template-columns, --grid-template-rows",
				"Popover",
			],
			["ActionJustifyContent", "--justify-content", "Toggle group"],
			["ActionAlignItems", "--align-items", "Toggle group"],
			["ActionFlexDirection", "--flex-direction", "Toggle group"],
			["ActionFlexWrap", "--flex-wrap", "Toggle group"],
			["ActionGap", "--column-gap, --row-gap", "Linked values"],
			["ActionPadding", "four padding sides", "Linked values"],
			["ActionMargin", "four margin sides", "Linked values"],
		],
	},
	{
		pane: "Color",
		rows: [
			["ActionBackgroundColor", "--background-color", "Color"],
			["ActionColor", "--color", "Color"],
			[
				"ActionBorder",
				"--border-width, --border-style, --border-color",
				"Color, Number",
			],
		],
	},
	{
		pane: "Typography",
		rows: [
			["ActionFontFamily", "--font-family", "Popover"],
			["ActionFontWeight", "--font-weight", "Select"],
			["ActionFontWidth", "--font-stretch", "Select"],
			["ActionFontSize", "--font-size", "Number"],
			["ActionLineHeight", "--line-height", "Number"],
			["ActionLetterSpacing", "--letter-spacing", "Number"],
			["ActionTextAlign", "--text-align", "Toggle group"],
			["ActionTextStyle", "--font-style", "Toggle group"],
			[
				"ActionTextDecoration",
				"line, style, color, thickness",
				"Toggle, Color, Number",
			],
			["ActionTextTransform", "--text-transform", "Toggle group"],
			["ActionTextShadow", "offset, blur, color", "Color, Number"],
		],
	},
	{
		pane: "Motion",
		rows: [
			[
				"ActionTransition",
				"--transition-duration, --transition-timing-function",
				"Popover",
			],
		],
	},
];

const actionGroups: { name: string; actions: string[] }[] = [
	{
		name: "Layers",
		actions: [
			"ADD_LAYER",
			"UPDATE_LAYER_CSS",
			"UPDATE_LAYER_VALUE",
			"UPDATE_LAYER_NAME",
			"UPDATE_LAYER_LOCK",
			"UPDATE_LAYER_ELEMENT_TYPE",
			"MOVE_LAYER",
			"DELETE_LAYERS",
			"SET_LAYERS",
		],
	},
	{
		name: "Breakpoints",
		actions: [
			"ADD_BREAKPOINT",
			"UPDATE_BREAKPOINT",
			"DELETE_BREAKPOINT",
			"SET_BREAKPOINTS",
			"SET_ACTIVE_BREAKPOINT",
			"SELECT_BREAKPOINT",
			"UPDATE_FRAME_STYLES",
		],
	},
	{
		name: "Rules and documents",
		actions: ["SET_RULES", "SET_ROLE", "SET_PREVIEW", "LOAD_DOCUMENT"],
	},
	{ name: "History", actions: ["UNDO", "REDO"] },
	{
		name: "Selection and view",
		actions: [
			"SELECT_LAYER",
			"DESELECT_ALL",
			"SET_ZOOM",
			"SET_PAN",
			"CENTER_ON_BREAKPOINTS",
		],
	},
];

const agentTools: [name: string, does: string][] = [
	["get_design", "The layers, breakpoints, tokens and rules"],
	["get_rules", "The rules, and what they mean for agents"],
	["allowed_changes", "What may change on one layer, before trying"],
	["list_tasks", "Open tasks, with the ones assigned to the agent first"],
	["wait_for_task", "Waits until a task is assigned to the agent"],
	["claim_task", "Marks a task as the agent's"],
	["apply_changes", "A batch of actions with a reason: all or nothing"],
	["set_token", "Adds or changes a token, with a reason"],
	["reply", "Replies on a task or comment"],
	["resolve_task", "Resolves a task with a summary"],
	["check_document", "Every place the design breaks its own rules"],
	["export_html", "The design as HTML and CSS"],
];

const installCode = `git clone ${GITHUB_URL}.git
cd design-ui
bun install
bun run build:packages
bun run pack:packages   # writes .packs/*.tgz`;

const installTarballs = `npm install \\
  ./design-ui/.packs/design-ui-core-0.1.0.tgz \\
  ./design-ui/.packs/design-ui-react-0.1.0.tgz \\
  ./design-ui/.packs/design-ui-mcp-0.1.0.tgz`;

const formatCode = `import { loadDocument } from "@design-ui/core";
import schema from "@design-ui/core/schema/document.v1.json";

const result = loadDocument(JSON.parse(text));
if (result.ok) use(result.document);
else console.error(result.problems); // [{ path, message }]`;

const liveAgentCode = `<Designer agentUrl="ws://localhost:8790" /* …your design… */>`;

const PACKAGES: [name: string, what: string][] = [
	[
		"@design-ui/core",
		"The format: types, loadDocument, the JSON Schema, actions and the store, rules (checkAction, allowed, checkDocument), tokens, exportHtml and exportPage, and createHeadlessEditor. No UI; runs in browsers and Node.",
	],
	[
		"@design-ui/react",
		"Designer and every piece inside it, the 30 controls and their building blocks, hooks like useDesignerApi and useAllowed, DesignView, and styles.css. React 18 or 19.",
	],
	[
		"@design-ui/mcp",
		"The design-ui-mcp command: an MCP server for an open editor or a design file. Node 20 or later.",
	],
];

export const DocsPage = () => (
	<div className="docs min-h-screen bg-muted text-foreground">
		<Rail items={nav} />
		<div className="px-2 py-2 sm:px-4 sm:py-4 lg:pl-60">
			<header className="flex items-center justify-between px-2 py-2 lg:hidden">
				<span className="font-semibold">Design UI</span>
				<a
					href="/demo/"
					className="font-medium text-sm underline underline-offset-2"
				>
					Open the editor
				</a>
			</header>
			<main className="mx-auto max-w-[1000px] rounded-[10px] border border-border bg-background px-5 sm:px-12">
				<section id="overview" data-section className="pt-20 pb-20 sm:pt-24">
					<Hero />
					<div className="mt-20 grid gap-6">
						<P>
							Design UI is a design editor you put inside your own React app.
							You set the rules for each design: the layout stays put, colors
							come from your brand tokens, the headline stays between 32 and
							48px. Then your team, your clients or an AI agent edit it, and any
							change that breaks a rule is refused before it lands.
						</P>
						<P>
							Handing off a design usually means picking between a full design
							tool, where you check every change after the fact, and a form that
							only edits text. Design UI gives people a real canvas and real
							controls, with limits you write once.
						</P>
						<ul className="grid max-w-[66ch] gap-2 text-[17px] text-foreground/80 leading-[1.6]">
							<li>
								<strong className="text-foreground">
									The rules live in the design.
								</strong>{" "}
								A design is one JSON file, and its rules are part of it. The
								editor, your own code and every agent that opens the file
								enforce the same limits.
							</li>
							<li>
								<strong className="text-foreground">
									Agents edit the file, not a screenshot.
								</strong>{" "}
								An agent connects over MCP, reads the same JSON the editor shows
								and sends the same changes a person would. Each change records
								who made it and why, and can be undone.
							</li>
							<li>
								<strong className="text-foreground">
									What they make is ready to ship.
								</strong>{" "}
								Render a saved design in React with <C>DesignView</C>, or export
								it as one HTML page.
							</li>
						</ul>
						<P>
							Press play to watch an agent fill in a card. The card's layout is
							locked and its title must stay between 16 and 32px. The agent
							tries a 48px title and adding a line under it. Both are refused,
							and the changes that fit the rules go through.
						</P>
						<ScriptedAgent />
						<div className="flex flex-wrap gap-2">
							<a
								href="/demo/"
								className="rounded-md bg-foreground px-4 py-2 font-medium text-background text-sm"
							>
								Try the editor
							</a>
							<a
								href={GITHUB_URL}
								className="rounded-md bg-input px-4 py-2 font-medium text-sm"
							>
								View on GitHub
							</a>
						</div>
					</div>
				</section>

				<Section id="try" title="Try it">
					<P>
						This is the whole editor. Switch to Editor at the top to see what
						someone working within the rules can change. Switch back to Builder
						and open Rules on the right to change the limits.
					</P>
					<EditorEmbed />
				</Section>

				<Section id="install" title="Install">
					<P>
						The packages aren't on npm yet. Build and pack them from the
						repository:
					</P>
					<Code code={installCode} title="Terminal" />
					<P>Then install the three tarballs in your app:</P>
					<Code code={installTarballs} title="Terminal" />
					<P>
						You need React 18 or 19. Import the editor's stylesheet once; your
						app doesn't need Tailwind, and the stylesheet doesn't touch the rest
						of your page.
					</P>
					<Code
						code={'import "@design-ui/react/styles.css";'}
						title="main.tsx"
					/>
					<P>
						The editor uses Geist and Geist Mono. Load them, or set your own
						fonts (see <a href="#theming">Theming</a>).
					</P>
				</Section>

				<Section id="quickstart" title="Quickstart">
					<P>
						An editor with a rule, in under 30 lines. As a <C>builder</C> you
						can change anything. As an <C>editor</C>, only the text and color;
						every other control shows as locked, and the change is refused even
						from a shortcut or an agent.
					</P>
					<Code code={displaySource(quickstartSource)} title="Quickstart.tsx" />
					<Sub id="pieces" title="The pieces">
						<P>
							An editor is ordinary JSX. <C>Designer</C> holds the state, and
							everything inside it is optional, so leave out what you don't need
							and arrange the rest however you like.
						</P>
						<Anatomy />
					</Sub>
				</Section>

				<Section id="format" title="The format">
					<P>
						A design is one JSON document: its layers, breakpoints, frame
						styles, tokens, rules, comments and change log. The format is
						versioned, and{" "}
						<a
							href={`${GITHUB_URL}/blob/main/packages/core/schema/document.v1.json`}
							className="underline underline-offset-2"
						>
							its JSON Schema
						</a>{" "}
						ships with <C>@design-ui/core</C>, so any language can check a file.
						In JavaScript, <C>loadDocument</C> checks it, upgrades older
						versions and says exactly what's wrong.
					</P>
					<Code code={formatCode} />
					<P>
						A layer is plain JSON: a type, a value, its styles as <C>cssVars</C>
						, and optional children. Pick a layer in the tree, change it, and
						watch what gets stored.
					</P>
					<Sandbox layers={card} selectedId="card">
						<div className="grid gap-2 md:grid-cols-[240px_minmax(0,1fr)]">
							<div className="rounded-lg border border-border">
								<PaneLayerTree />
								<div className="grid gap-3 border-border border-t p-4">
									<ActionBackgroundColor />
									<ActionPadding />
								</div>
							</div>
							<div className="grid min-w-0 content-start gap-2">
								<div className="rounded-lg bg-muted p-6">
									<LayerStage />
								</div>
								<LiveJson />
							</div>
						</div>
					</Sandbox>

					<Sub id="breakpoints" title="Breakpoints">
						<P>
							Styles are mobile-first. <C>cssVars</C> applies to the smallest
							breakpoint, and larger ones store only what they change in{" "}
							<C>breakpointCssVars</C>. Switch to Tablet to see an inherited
							value, then set a size to override it.
						</P>
						<Sandbox
							layers={responsiveLayer}
							selectedId="r"
							breakpoints={responsiveBreakpoints}
						>
							<BreakpointDemo />
							<LiveJson />
						</Sandbox>
					</Sub>
				</Section>

				<Section id="rules" title="Rules">
					<P>
						A rule picks layers, by id or type, and says what may change on
						them: their content, their structure, which styles, and which
						values. Where several rules cover a layer, the strictest of each
						wins. A document with no rules allows everything.
					</P>
					<Code code={displaySource(rulesSource)} title="rules.ts" />
					<P>
						Name a group like <C>group:color</C>, <C>group:typography</C>,{" "}
						<C>group:spacing</C> or <C>group:size</C> instead of listing each
						property. Values can be limited to tokens, to a range with a unit,
						or to a list.
					</P>
					<P>
						Rules are checked in the store, before any change lands, so they
						hold for panels, shortcuts, the API and agents alike. When one
						blocks a change, the editor says which rule and why.{" "}
						<C>checkDocument</C> finds every place a file already breaks its
						rules, for example after editing it by hand.
					</P>
					<Sub id="roles" title="Builders and editors">
						<P>
							Pass <C>role</C> to <C>Designer</C>. Builders aren't limited by
							rules and are the only ones who can change them: select a layer
							and open the Rules tab. Each rule change can be undone and shows
							in Activity. Editors work within the rules, and agents always
							count as editors.
						</P>
						<P>
							Editor preview, in the header, shows a builder exactly what an
							editor will see. <C>EditorPreviewToggle</C> adds it to your own
							header.
						</P>
					</Sub>
				</Section>

				<Section id="agents" title="Agents">
					<P>
						An agent doesn't need screenshots or simulated clicks. It reads the
						same JSON the editor renders and sends the same actions the panels
						send, under the same rules. Every change needs a reason, which shows
						in Activity next to the change, and any change can be undone or
						reverted. Design UI doesn't include a model: the agent is whichever
						MCP client you connect.
					</P>

					<Sub id="agents-live" title="In an open editor">
						<P>
							Give <C>Designer</C> an <C>agentUrl</C>, then add the server to
							your MCP client. In Claude Code:
						</P>
						<Code code={liveAgentCode} title="App.tsx" />
						<Code
							code="claude mcp add design -- npx design-ui-mcp"
							title="Terminal"
						/>
						<P>
							The Activity tab says Agent connected. Leave a task on a layer
							(press <C>C</C> and click it), assign it to the agent, and ask
							your agent to work through its tasks. Its changes appear live.
						</P>
					</Sub>

					<Sub id="agents-file" title="On a design file">
						<P>
							Give the server a design file to work with no browser open. It
							answers from the file and saves after each change, with the same
							rules and the same change log. When an editor connects, it shows
							that file, and changes made in the editor are saved back.
						</P>
						<Code
							code="claude mcp add design -- npx design-ui-mcp ./design.json"
							title="Terminal"
						/>
						<P>
							To do the same in your own code, <C>createHeadlessEditor</C> in{" "}
							<C>@design-ui/core</C> answers the same requests over a document
							in memory.
						</P>
					</Sub>

					<Sub id="agents-bridge" title="Your own connection">
						<P>
							To connect an agent some other way, render a component like this
							inside <C>Designer</C>.
						</P>
						<Code
							code={displaySource(agentBridgeSource)}
							title="AgentBridge.tsx"
						/>
					</Sub>
				</Section>

				<Section id="delivery" title="Delivery">
					<Sub id="saving" title="Saving">
						<P>
							Saving is up to you. <C>exportDocument</C> gives you the whole
							design as one document; store it wherever you like and check it
							with <C>loadDocument</C> when you read it back.
						</P>
						<Code
							code={displaySource(savedEditorSource)}
							title="SavedEditor.tsx"
						/>
					</Sub>
					<Sub id="rendering" title="React and HTML">
						<P>
							<C>DesignView</C> renders a saved design in any React app from the
							same HTML and CSS as the export: mobile-first, with tokens as CSS
							variables and theme or brand modes as attributes. No editor code
							is loaded. Anywhere else, <C>exportPage</C> writes one HTML page,
							and the editor's Export menu does the same for people.
						</P>
						<Code code={displaySource(deliverySource)} title="Delivery.tsx" />
					</Sub>
				</Section>

				<Section id="extend" title="Extend">
					<P>
						Text, image and frame layers are built with the same public shapes
						you use for your own.
					</P>

					<Sub id="custom-layers" title="Custom layers" badge="LayerType">
						<P>
							A layer type says what it's called, which styles it accepts and
							how it renders. Pass it to{" "}
							<C>{"<Designer layerTypes={[...]}>"}</C> and it appears in the
							add-layer dialog. To export it, give it an <C>html</C> description
							too.
						</P>
						<ControlDemo
							layerTypes={[badgeLayerType]}
							layers={[
								{
									id: "badge",
									type: "badge",
									...badgeLayerType.defaultValues,
								},
							]}
							selectedId="badge"
							watch={["--background-color", "--font-size"]}
						>
							<ActionBackgroundColor />
							<ActionFontSize />
						</ControlDemo>
						<Code
							code={displaySource(badgeSource)}
							title="badgeLayerType.tsx"
						/>
					</Sub>

					<Sub
						id="custom-controls"
						title="Custom controls"
						badge="useBreakpointCss"
					>
						<P>
							When the building blocks don't fit, write your own. This hook
							gives you the value for the active breakpoint and a setter, and{" "}
							<C>usePropertyAccess</C> says whether the rules allow it. Render
							the control anywhere inside <C>Designer</C>.
						</P>
						<ControlDemo
							layers={card}
							selectedId="card"
							watch={["--background-color"]}
						>
							<BrandColors />
						</ControlDemo>
						<Code
							code={displaySource(brandColorsSource)}
							title="BrandColors.tsx"
						/>
					</Sub>

					<Sub id="theming" title="Theming">
						<P>
							The editor's colors, radius and fonts are CSS variables starting
							with <C>--ds-</C>. Override them on <C>.ds</C> in a stylesheet
							loaded after the editor's. For dark mode, put the <C>dark</C>{" "}
							class on the editor or any element above it.
						</P>
						<Code
							code={`.ds {
  --ds-accent: oklch(60% 0.2 145);
  --ds-radius: 4px;
  --ds-font-sans: "Inter", system-ui, sans-serif;
}`}
							title="theme.css"
						/>
					</Sub>
				</Section>

				<Section id="controls" title="Controls">
					<P>
						Every control is a thin wrapper around one of six building blocks.
						Give a block a CSS property and a label, and it reads from and
						writes to the selected layer, within the rules. The code below is
						the source of each example.
					</P>
					<Sub
						id="numeric"
						title="Number and unit"
						badge="NumericActionControl"
					>
						<P>
							A number with its unit inside the field. Drag to change it, click
							to type, and type a unit like <C>2rem</C> to switch. Set{" "}
							<C>min</C> and <C>max</C> to limit the value.
						</P>
						<ControlDemo
							layers={textLayer({})}
							selectedId="t"
							watch={["--font-size"]}
						>
							<ActionFontSize />
						</ControlDemo>
						<Code code={fontSizeSource.trimEnd()} title="ActionFontSize.tsx" />
					</Sub>

					<Sub id="slider" title="Slider" badge="SliderActionControl">
						<P>
							A number field that is also a slider. The fill shows where the
							value sits between <C>min</C> and <C>max</C>, and dragging can't
							go past them.
						</P>
						<ControlDemo
							layers={textLayer({ "--font-weight": "400" })}
							selectedId="t"
							watch={["--font-weight"]}
						>
							<WeightSlider />
						</ControlDemo>
						<Code code={displaySource(weightSource)} title="WeightSlider.tsx" />
					</Sub>

					<Sub id="toggle" title="Toggle group" badge="ToggleGroupControl">
						<P>
							One choice from a short list, shown as text or icons. This control
							hides itself unless the layer is a flex container.
						</P>
						<ControlDemo
							layers={rowFrame({
								"--display": "flex",
								"--flex-direction": "row",
							})}
							selectedId="f"
							watch={["--flex-direction"]}
						>
							<ActionFlexDirection />
						</ControlDemo>
						<Code
							code={flexDirectionSource.trimEnd()}
							title="ActionFlexDirection.tsx"
						/>
					</Sub>

					<Sub id="select" title="Select" badge="SelectActionControl">
						<P>One choice from a longer list.</P>
						<ControlDemo
							layers={rowFrame({ "--display": "flex" })}
							selectedId="f"
							watch={["--display"]}
						>
							<ActionDisplay />
						</ControlDemo>
						<Code
							code={displaySelectSource.trimEnd()}
							title="ActionDisplay.tsx"
						/>
					</Sub>

					<Sub id="color" title="Color" badge="ColorActionPopover">
						<P>
							A swatch that opens a picker for hex, OKLCH and Display P3. Paste
							any CSS color and it's converted.
						</P>
						<ControlDemo
							layers={card}
							selectedId="card"
							watch={["--background-color"]}
						>
							<ActionBackgroundColor />
						</ControlDemo>
						<Code
							code={backgroundSource.trimEnd()}
							title="ActionBackgroundColor.tsx"
						/>
					</Sub>

					<Sub id="popover" title="Popover" badge="ActionPopover">
						<P>
							Groups related fields behind one row, which is how padding, margin
							and gap stay compact. Put any controls inside it.
						</P>
						<ControlDemo
							layers={rowFrame({ "--display": "flex" })}
							selectedId="f"
							watch={["--padding-block-start", "--padding-inline-start"]}
						>
							<SpacingPopover />
						</ControlDemo>
						<Code
							code={displaySource(spacingSource)}
							title="SpacingPopover.tsx"
						/>
					</Sub>

					<Sub id="layout" title="Layout" badge="ActionLayout">
						<P>
							Everything about how a layer sits and arranges its contents, in
							one control. Choose a direction, point at where children should
							sit, and drag the padding and margin values on the box.
						</P>
						<P>
							Solid values are set at this breakpoint. Outlined values are
							inherited from a smaller one. Each size can be a number, or Fill,
							Hug or Auto.
						</P>
						<ControlDemo
							layers={rowFrame({
								"--display": "flex",
								"--flex-direction": "row",
							})}
							selectedId="f"
							watch={["--flex-direction", "--justify-content", "--align-items"]}
						>
							<ActionLayout />
						</ControlDemo>
					</Sub>

					<Sub id="transition" title="Transition" badge="ActionTransition">
						<P>
							Draw a Bézier curve, or set a spring by feel or by physical
							values. Springs are saved as CSS <C>linear()</C> easing, so they
							work without JavaScript.
						</P>
						<ControlDemo
							layers={textLayer({})}
							selectedId="t"
							watch={["--transition-duration", "--transition-timing-function"]}
						>
							<ActionTransition />
						</ControlDemo>
					</Sub>

					<Sub id="all-controls" title="All 30 controls">
						<P>
							<C>DesignActionPanel</C> arranges these into four panes. Each is
							its own component, so you can use any of them on its own.
						</P>
						<div className="overflow-x-auto">
							<table className="w-full min-w-[560px] border-collapse text-left text-sm">
								{catalog.map(({ pane, rows }) => (
									<tbody key={pane}>
										<tr>
											<th
												colSpan={3}
												scope="colgroup"
												className="pt-6 pb-2 font-semibold"
											>
												{pane}
											</th>
										</tr>
										{rows.map(([control, writes, builtWith]) => (
											<tr key={control} className="border-border border-t">
												<td className="py-2 pr-4">
													<code className="text-[13px]">{control}</code>
												</td>
												<td className="py-2 pr-4 text-muted-foreground">
													{writes}
												</td>
												<td className="py-2 text-muted-foreground">
													{builtWith}
												</td>
											</tr>
										))}
									</tbody>
								))}
							</table>
						</div>
					</Sub>
				</Section>

				<Section id="api" title="API reference">
					<Sub id="api-packages" title="Packages">
						<dl className="grid gap-4">
							{PACKAGES.map(([name, what]) => (
								<div key={name}>
									<dt>
										<C>{name}</C>
									</dt>
									<dd className="mt-1 max-w-[66ch] text-muted-foreground text-sm">
										{what}
									</dd>
								</div>
							))}
						</dl>
						<P>
							Types are included. Everything is exported from each package's
							entry point; there are no deep imports.
						</P>
					</Sub>
					<Sub id="api-actions" title="Actions" badge="Action">
						<P>
							Every edit is one of these. Consecutive CSS edits to the same
							properties of a layer merge into one undo step. <C>SET_LAYERS</C>{" "}
							and <C>LOAD_DOCUMENT</C> replace the design and clear the history.
						</P>
						<dl className="grid gap-4">
							{actionGroups.map(({ name, actions }) => (
								<div key={name}>
									<dt className="font-medium text-sm">{name}</dt>
									<dd className="mt-1.5 flex flex-wrap gap-1">
										{actions.map((action) => (
											<C key={action}>{action}</C>
										))}
									</dd>
								</div>
							))}
						</dl>
					</Sub>
					<Sub id="api-tools" title="Agent tools">
						<P>What an agent connected through the MCP server can do.</P>
						<dl className="grid gap-2 sm:grid-cols-[max-content_1fr] sm:gap-x-6">
							{agentTools.map(([name, does]) => (
								<div key={name} className="contents">
									<dt>
										<C>{name}</C>
									</dt>
									<dd className="text-muted-foreground text-sm">{does}</dd>
								</div>
							))}
						</dl>
					</Sub>
				</Section>

				<footer className="flex flex-wrap justify-between gap-2 border-border border-t py-8 text-muted-foreground text-sm">
					<span>MIT License. Built by Really Good Work.</span>
					<a href={GITHUB_URL} className="underline underline-offset-2">
						GitHub
					</a>
				</footer>
			</main>
		</div>
	</div>
);
