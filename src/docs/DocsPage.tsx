import type { ReactNode } from "react";
import { ActionBackgroundColor } from "../components/actions/ActionBackgroundColor";
import backgroundSource from "../components/actions/ActionBackgroundColor.tsx?raw";
import { ActionDisplay } from "../components/actions/ActionDisplay";
import displaySelectSource from "../components/actions/ActionDisplay.tsx?raw";
import { ActionFlexDirection } from "../components/actions/ActionFlexDirection";
import flexDirectionSource from "../components/actions/ActionFlexDirection.tsx?raw";
import { ActionFontSize } from "../components/actions/ActionFontSize";
import fontSizeSource from "../components/actions/ActionFontSize.tsx?raw";
import { ActionLayout } from "../components/actions/ActionLayout";
import { ActionPadding } from "../components/actions/ActionPadding";
import { ActionTransition } from "../components/actions/ActionTransition";
import { PaneLayerTree } from "../components/PaneLayerTree";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useDesignerSelector } from "../hooks/useDesignerSelector";
import type { Breakpoint, Layer } from "../lib/Types";
import { Anatomy } from "./Anatomy";
import { Code, CopyButton, displaySource } from "./Code";
import { EditorEmbed } from "./EditorEmbed";
import agentBridgeSource from "./examples/AgentBridge.tsx?raw";
import { BrandColors } from "./examples/BrandColors";
import brandColorsSource from "./examples/BrandColors.tsx?raw";
import { badgeLayerType } from "./examples/badgeLayerType";
import badgeSource from "./examples/badgeLayerType.tsx?raw";
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
	{ id: "compose", label: "Put it together" },
	{
		id: "document",
		label: "The document",
		children: [{ id: "breakpoints", label: "Breakpoints" }],
	},
	{ id: "controls", label: "Controls", children: controlNav },
	{
		id: "extend",
		label: "Extend it",
		children: [
			{ id: "custom-layers", label: "Custom layers" },
			{ id: "custom-controls", label: "Custom controls" },
		],
	},
	{ id: "agents", label: "AI agents" },
	{ id: "launch", label: "Launch" },
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

const prompts = [
	{
		title: "Add a layer type",
		text: "In this Coral Design project, add a new layer type called “video”. Follow src/lib/layers/image.tsx, list its supportedCssProperties, and register it with the layerTypes prop on <Designer> in src/App.tsx.",
	},
	{
		title: "Add a control",
		text: "In this Coral Design project, add a control for the selected layer's --z-index. Build it with NumericActionControl like src/components/actions/ActionFontSize.tsx, and add it to the Layer pane in src/components/DesignActionPanel.tsx.",
	},
	{
		title: "Connect an agent",
		text: "In this Coral Design project, add a component inside <Designer> that receives Action objects (type in src/hooks/useDesigner.ts) over a WebSocket, validates them, passes them to the dispatch from useDesignerAction, and sends back the layers from useLayers after each change.",
	},
];

const Prompt = ({ title, text }: { title: string; text: string }) => (
	<div className="flex items-start gap-3 rounded-lg bg-(--code) p-4">
		<div className="min-w-0 flex-1">
			<div className="font-medium text-sm text-white">{title}</div>
			<p className="mt-1 text-sm text-zinc-300 leading-relaxed">{text}</p>
		</div>
		<CopyButton text={text} label={`Copy the ${title} prompt`} />
	</div>
);

const installCode = `git clone ${GITHUB_URL}.git
cd design-ui
bun install
bun run dev`;

const buildCode = `bun run build   # type-checks, then writes dist/
bun run preview # serves dist/ locally`;

export const DocsPage = () => (
	<div className="docs min-h-screen bg-muted text-foreground">
		<Rail items={nav} />
		<div className="px-2 py-2 sm:px-4 sm:py-4 lg:pl-60">
			<header className="flex items-center justify-between px-2 py-2 lg:hidden">
				<span className="font-semibold">Coral Design</span>
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
							Coral Design is a set of open-source React components for building
							visual editors. You get an infinite canvas, responsive frames, a
							layer tree and 30 style controls, and you decide which pieces your
							editor uses. Every edit is a small JSON action, so a person and an
							AI agent can work on the same design.
						</P>
						<div className="flex flex-wrap gap-2">
							<a
								href="/demo/"
								className="rounded-md bg-foreground px-4 py-2 font-medium text-background text-sm"
							>
								Open the editor
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
						This is the complete demo, running live. Select a layer on the
						canvas, change it in the panel on the right, then undo it.
					</P>
					<EditorEmbed />
				</Section>

				<Section id="install" title="Install">
					<P>
						Coral Design isn't on npm yet. Clone the repository, or copy{" "}
						<C>src/</C> into a React 18 app that uses Tailwind CSS 4.
					</P>
					<Code code={installCode} />
					<P>
						The docs open at <C>localhost:5173</C> and the editor at{" "}
						<C>/demo/</C>. The examples below show paths as if your file is
						directly inside <C>src/</C>.
					</P>
				</Section>

				<Section id="compose" title="Put it together">
					<P>
						An editor is ordinary JSX. <C>Designer</C> holds the state, and
						everything inside it is optional, so leave out what you don't need
						and arrange the rest however you like.
					</P>
					<Anatomy />
				</Section>

				<Section id="document" title="The document">
					<P>
						A design is an array of layers. A layer is plain JSON: a type, a
						value, its styles as <C>cssVars</C>, and optional children. Pick a
						layer in the tree, change it, and watch what gets stored.
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

				<Section id="controls" title="Controls">
					<P>
						Every control is a thin wrapper around one of six building blocks.
						Give a block a CSS property and a label, and it reads from and
						writes to the selected layer. The code below is the source of each
						example.
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

				<Section id="extend" title="Extend it">
					<P>
						Text, image and frame layers are built with the same public shapes
						you use for your own.
					</P>

					<Sub id="custom-layers" title="Custom layers" badge="LayerType">
						<P>
							A layer type says what it's called, which styles it accepts and
							how it renders. Pass it to{" "}
							<C>{"<Designer layerTypes={[...]}>"}</C> and it appears in the
							add-layer dialog.
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
							gives you the value for the active breakpoint and a setter. Render
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
				</Section>

				<Section id="agents" title="Edit with an AI agent">
					<P>
						An agent doesn't need screenshots or simulated clicks here. It reads
						the same JSON the editor renders, and sends the same actions the
						panels send. Its edits appear live and land in the undo history
						alongside yours.
					</P>
					<P>
						Run this script to see it. No model is involved: these are the
						actions an agent would send.
					</P>
					<ScriptedAgent />
					<P>
						The repository includes an MCP server, so Claude Code or any MCP
						client can work on the design. Pass <C>agentUrl</C> to{" "}
						<C>{"<Designer>"}</C>, run the editor, then add the server to your
						client from the project folder:
					</P>
					<Code
						code="claude mcp add coral -- bun agent/mcp-server.ts"
						title="Terminal"
					/>
					<P>
						The agent can read the design, pick up tasks you assign it in
						Activity, change the design and resolve the task. Each change needs
						a reason, which shows in Activity, and you can undo any of them.
						Coral Design doesn't include a model: the agent is whichever client
						you connect.
					</P>
					<P>
						To use another transport, connect your agent with a component like
						this one instead.
					</P>
					<Code
						code={displaySource(agentBridgeSource)}
						title="AgentBridge.tsx"
					/>

					<Sub id="action-reference" title="Actions" badge="Action">
						<P>
							Consecutive CSS edits to the same properties of a layer merge into
							one undo step. <C>SET_LAYERS</C> replaces the document and can't
							be undone.
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

					<Sub id="prompts" title="Prompts for your coding agent">
						<div className="grid gap-2">
							{prompts.map((prompt) => (
								<Prompt key={prompt.title} {...prompt} />
							))}
						</div>
					</Sub>
				</Section>

				<Section id="launch" title="Launch">
					<P>
						The build is a static site, so any static host can serve it. The
						docs are at the root of <C>dist/</C> and the editor is in{" "}
						<C>dist/demo/</C>.
					</P>
					<Code code={buildCode} />
					<P>
						Saving is up to you. Start from <C>defaultLayers</C> and store
						whatever <C>onLayersChange</C> gives you, in local storage or your
						own API.
					</P>
					<Code
						code={displaySource(savedEditorSource)}
						title="SavedEditor.tsx"
					/>
					<P>
						The CSS tab in the editor shows each layer's styles. HTML export
						isn't built yet.
					</P>
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
