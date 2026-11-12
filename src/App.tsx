import {
	AGENT_PORT,
	calculateBoundingBox,
	type Role,
	tokenCssValue,
} from "@design-ui/core";
import { useEffect, useState } from "react";
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
import { ExportMenu } from "./components/ExportMenu";
import { ConnectAgentButton, HelpMenu } from "./components/help/HelpMenu";
import { HelpProvider } from "./components/help/HelpProvider";
import { PaneLayerTree } from "./components/PaneLayerTree";
import { RuleNotice } from "./components/RuleNotice";
import { TokensPane } from "./components/tokens/TokensPane";
import { TokenTable } from "./components/tokens/TokenTable";
import { demoAnnotations } from "./demo/annotations";
import { demoBreakpoints, demoLayers, demoRules } from "./demo/design";
import { demoTokenDimensions, demoTokens } from "./demo/tokens";
import { useSelectedBreakpoint } from "./hooks/useActiveBreakpoint";
import { useDesignerAction } from "./hooks/useDesignerAction";
import { useDesignerApi } from "./hooks/useDesignerApi";
import { useTokens } from "./hooks/useTokens";

/** Open with every frame in view, whatever size the canvas is. */
const FitFramesOnLoad = () => {
	const dispatch = useDesignerAction();
	useEffect(() => {
		const canvas = document.querySelector("[data-slot='designer-canvas']");
		if (!canvas || canvas.clientWidth === 0) return;
		const box = calculateBoundingBox(demoBreakpoints);
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

/** Builders set the rules; editors work within them. */
const RoleSwitch = ({
	role,
	onChange,
}: {
	role: Role;
	onChange: (role: Role) => void;
}) => (
	<fieldset className="flex items-center gap-2 text-control">
		<legend className="sr-only">Edit as</legend>
		<span aria-hidden="true" className="text-muted-foreground">
			Edit as
		</span>
		<span className="flex rounded-md bg-muted p-[3px]">
			{(["builder", "editor"] as const).map((r) => (
				<button
					key={r}
					type="button"
					aria-pressed={role === r}
					onClick={() => onChange(r)}
					className={`h-6 rounded-sm px-2 capitalize text-muted-foreground hover:text-foreground ${role === r ? "bg-raised text-foreground shadow-xs" : ""}`}
				>
					{r}
				</button>
			))}
		</span>
	</fieldset>
);

function App() {
	const [role, setRole] = useState<Role>("builder");
	return (
		<div className="flex h-screen w-screen isolate ds">
			<Designer
				layers={demoLayers}
				breakpoints={demoBreakpoints}
				// Like <body> styles. Design content starts from browser defaults,
				// so the demo sets its own font.
				frameStyles={{ "--font-family": tokenCssValue("font.family.body") }}
				tokens={demoTokens}
				tokenDimensions={demoTokenDimensions}
				annotations={demoAnnotations}
				rules={demoRules}
				role={role}
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
						<div className="ml-auto flex items-center gap-2">
							<RoleSwitch role={role} onChange={setRole} />
							<ExportMenu />
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
								<RuleNotice />
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
