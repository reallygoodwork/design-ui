import { useEffect } from "react";
import { ActivityPane } from "./components/activity/ActivityPane";
import { AnnotationLayer } from "./components/activity/AnnotationLayer";
import { BreakpointPropertiesPanel } from "./components/BreakpointPropertiesPanel";
import { CSSPanel } from "./components/CSSPanel";
import { Tabs } from "./components/common/Tabs";
import { DesignActionPanel } from "./components/DesignActionPanel";
import { Designer } from "./components/Designer";
import { DesignerCanvas } from "./components/DesignerCanvas";
import { DesignerContent } from "./components/DesignerContent";
import { DesignerFrame } from "./components/DesignerFrame";
import { DesignerHeader } from "./components/DesignerHeader";
import { DesignerPane } from "./components/DesignerPane";
import { DesignPanel } from "./components/DesignerPanel";
import { DesignToolbarContainer } from "./components/DesignToolbarContainer";
import { ConnectAgentButton, HelpMenu } from "./components/help/HelpMenu";
import { HelpProvider } from "./components/help/HelpProvider";
import { PaneLayerTree } from "./components/PaneLayerTree";
import { TokensPane } from "./components/tokens/TokensPane";
import { TokenTable } from "./components/tokens/TokenTable";
import { demoAnnotations } from "./demo/annotations";
import { demoTokenDimensions, demoTokens } from "./demo/tokens";
import { useSelectedBreakpoint } from "./hooks/useActiveBreakpoint";
import { useDesignerAction } from "./hooks/useDesignerAction";
import { useDesignerApi } from "./hooks/useDesignerApi";
import { useTokens } from "./hooks/useTokens";
import { AGENT_PORT } from "./lib/agentProtocol";
import { calculateBoundingBox } from "./lib/breakpointUtils";
import type { Breakpoint, Layer } from "./lib/Types";
import { tokenCssValue } from "./lib/tokens";

const initialLayers: Layer[] = [
	{
		id: "page",
		type: "frame",
		name: "Page",
		value: "",
		cssVars: {
			"--display": "flex",
			"--flex-direction": "column",
			"--row-gap": tokenCssValue("space.stack"),
			"--padding-block-start": "40px",
			"--padding-block-end": "40px",
			"--padding-inline-start": tokenCssValue("space.page.inline"),
			"--padding-inline-end": tokenCssValue("space.page.inline"),
			"--background-color": tokenCssValue("color.bg.page"),
		},
		breakpointCssVars: {
			desktop: {
				"--padding-block-start": "96px",
			},
		},
		children: [
			{
				id: "title",
				type: "text",
				name: "Title",
				value: "Field notes from a small studio",
				elementType: "h1",
				cssVars: {
					"--font-size": "48px",
					"--line-height": "52px",
					"--font-weight": tokenCssValue("font.weight.heading"),
					"--color": tokenCssValue("color.text.primary"),
				},
				breakpointCssVars: {
					desktop: { "--font-size": "112px", "--line-height": "112px" },
				},
			},
			{
				id: "intro",
				type: "text",
				name: "Intro",
				value:
					"Select any layer, then change it in the panel on the right. Each frame shows the same layers at a different width.",
				cssVars: {
					"--font-size": "18px",
					"--line-height": "28px",
					"--color": "#52525b",
				},
				breakpointCssVars: {
					desktop: { "--font-size": "28px", "--line-height": "40px" },
				},
			},
			{
				id: "swatch",
				type: "frame",
				name: "Feature",
				value: "",
				cssVars: {
					"--height": "220px",
					"--background-color": tokenCssValue("color.action.primary"),
				},
				breakpointCssVars: { desktop: { "--height": "360px" } },
			},
		],
	},
];

// Define initial breakpoints (mobile-first: smallest to largest)
const initialBreakpoints: Breakpoint[] = [
	{
		id: "mobile",
		name: "Mobile",
		width: 375,
		height: 667,
		position: { x: 0, y: 0 },
	},
	{
		id: "tablet",
		name: "Tablet",
		width: 768,
		height: 1024,
		position: { x: 425, y: 0 },
	},
	{
		id: "desktop",
		name: "Desktop",
		width: 1440,
		height: 900,
		position: { x: 1243, y: 0 },
	},
];

/** Open with every frame in view, whatever size the canvas is. */
const FitFramesOnLoad = () => {
	const dispatch = useDesignerAction();
	useEffect(() => {
		const canvas = document.querySelector("[data-slot='designer-canvas']");
		if (!canvas || canvas.clientWidth === 0) return;
		const box = calculateBoundingBox(initialBreakpoints);
		const zoom = Math.min(
			(canvas.clientWidth - 80) / box.width,
			(canvas.clientHeight - 120) / box.height,
			1
		);
		dispatch({ type: "SET_ZOOM", payload: zoom });
		dispatch({ type: "CENTER_ON_BREAKPOINTS" });
	}, [dispatch]);
	return null;
};

/** A selected frame shows its own settings. Otherwise, the layer's styles. */
const Inspector = () => {
	const selectedBreakpoint = useSelectedBreakpoint();
	if (selectedBreakpoint) {
		return (
			<div className="h-full overflow-y-auto">
				<BreakpointPropertiesPanel />
			</div>
		);
	}
	return (
		<Tabs
			items={[
				{
					label: "Styles",
					value: "layer",
					hint: "Change the selected layer",
					content: <DesignActionPanel />,
				},
				{
					label: "CSS",
					value: "css",
					hint: "The CSS the selected layer produces",
					content: <CSSPanel />,
				},
			]}
		/>
	);
};

/** Layers and tokens. Going back to Layers brings the canvas back from a full-view token panel. */
const LeftPanel = () => {
	const { tableMaximized, setTableMaximized } = useTokens();
	return (
		<div
			className="contents"
			onClickCapture={(event) => {
				const tab = (event.target as HTMLElement).closest("[role=tab]");
				if (tableMaximized && tab?.textContent === "Layers")
					setTableMaximized(false);
			}}
		>
			<Tabs
				items={[
					{
						label: "Layers",
						value: "layers",
						hint: "Every layer on the page, in order",
						content: (
							<DesignerPane>
								<PaneLayerTree />
							</DesignerPane>
						),
					},
					{
						label: "Tokens",
						value: "tokens",
						hint: "Shared colors, sizes and spacing",
						content: <TokensPane />,
					},
					{
						label: "Activity",
						value: "activity",
						hint: "Changes, comments and tasks",
						content: <ActivityPane />,
					},
				]}
			/>
		</div>
	);
};

/**
 * The demo's agent fixes one hardcoded color soon after load, with a reason,
 * to show how an agent's change and its note land in Activity.
 */
const DemoAgentEdit = () => {
	const { dispatch } = useDesignerApi();
	useEffect(() => {
		const timer = setTimeout(
			() =>
				dispatch(
					{
						type: "UPDATE_LAYER_CSS",
						payload: {
							id: "intro",
							css: { "--color": tokenCssValue("color.text.muted") },
							breakpointId: "mobile",
						},
					},
					{
						actor: { kind: "agent", name: "Agent" },
						reason:
							"Intro used a hardcoded #52525b, which stays dark in dark mode. Switched it to color.text.muted so it follows the theme.",
					}
				),
			1500
		);
		return () => clearTimeout(timer);
	}, [dispatch]);
	return null;
};

function App() {
	return (
		<div className="flex h-screen w-screen isolate ds">
			<Designer
				layers={initialLayers}
				breakpoints={initialBreakpoints}
				// Like <body> styles. Design content starts from browser defaults,
				// so the demo sets its own font.
				frameStyles={{ "--font-family": tokenCssValue("font.family.body") }}
				tokens={demoTokens}
				tokenDimensions={demoTokenDimensions}
				annotations={demoAnnotations}
				// While developing, connect to a local agent: bun run agent
				agentUrl={
					import.meta.env.DEV ? `ws://localhost:${AGENT_PORT}` : undefined
				}
			>
				<HelpProvider>
					<DesignerHeader>
						{/* _top: the docs page embeds this editor in an iframe */}
						<a
							href="/"
							target="_top"
							className="text-control font-medium text-muted-foreground hover:text-foreground"
						>
							Coral Design docs
						</a>
						<div className="ml-auto flex items-center gap-1">
							<ConnectAgentButton />
							<HelpMenu />
						</div>
					</DesignerHeader>
					<DesignerContent>
						<DesignPanel>
							<LeftPanel />
						</DesignPanel>

						{/* The token table opens under the canvas; the toolbar stays on the canvas. */}
						<div className="flex min-w-0 flex-1 flex-col">
							<div className="relative flex min-h-0 flex-1">
								<DesignerCanvas>
									<DesignerFrame />
								</DesignerCanvas>
								<AnnotationLayer />
								<DesignToolbarContainer />
							</div>
							<TokenTable />
						</div>

						<DesignPanel>
							<Inspector />
						</DesignPanel>

						<FitFramesOnLoad />
						<DemoAgentEdit />
					</DesignerContent>
				</HelpProvider>
			</Designer>
		</div>
	);
}

export default App;
