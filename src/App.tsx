import {
	AGENT_PORT,
	calculateBoundingBox,
	type Role,
	tokenCssValue,
} from "@design-ui/core";
import {
	ActivityPane,
	AnnotationLayer,
	BreakpointPropertiesPanel,
	ConnectAgentButton,
	CSSPanel,
	DesignActionPanel,
	Designer,
	DesignerCanvas,
	DesignerContent,
	DesignerFrame,
	DesignerHeader,
	DesignerPane,
	DesignPanel,
	DesignToolbarContainer,
	EditorPreviewToggle,
	ExportMenu,
	HelpMenu,
	HelpProvider,
	PaneLayerTree,
	RuleNotice,
	RulesPanel,
	Tabs,
	TokensPane,
	TokenTable,
	useCanSetRules,
	useDesignerAction,
	useDesignerApi,
	useSelectedBreakpoint,
	useTokens,
} from "@design-ui/react";
import { useEffect, useState } from "react";
import { demoAnnotations } from "./demo/annotations";
import { demoBreakpoints, demoLayers, demoRules } from "./demo/design";
import { demoTokenDimensions, demoTokens } from "./demo/tokens";

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
	const canSetRules = useCanSetRules();
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
				...(canSetRules
					? [
							{
								label: "Rules",
								value: "rules",
								hint: "What editors and agents can change",
								content: <RulesPanel />,
							},
						]
					: []),
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

const ROLES = ["builder", "editor"] as const;

const ROLE_HINTS: Record<Role, string> = {
	builder: "Changes anything and sets the rules",
	editor: "Works within the rules, like an agent",
};

/**
 * Builders set the rules; editors work within them. The demo's main switch,
 * so it sits in the middle of the header with what each role means.
 */
const RoleSwitch = ({
	role,
	onChange,
}: {
	role: Role;
	onChange: (role: Role) => void;
}) => (
	<fieldset className="flex items-center gap-2.5 text-control">
		<legend className="sr-only">Edit as</legend>
		<span aria-hidden="true" className="font-medium">
			Edit as
		</span>
		<span className="flex rounded-md bg-muted p-[3px]">
			{ROLES.map((r) => (
				<button
					key={r}
					type="button"
					aria-pressed={role === r}
					aria-describedby="role-hint"
					onClick={() => onChange(r)}
					className={`h-7 rounded-sm px-3 font-medium capitalize text-muted-foreground hover:text-foreground transition-[scale,background-color,color,opacity] duration-150 ease-out motion-safe:enabled:active:scale-[0.96] ${role === r ? "bg-raised text-foreground shadow-xs" : ""}`}
				>
					{r}
				</button>
			))}
		</span>
		{/* Every hint shares one cell, so switching roles doesn't move the header */}
		<span className="hidden text-muted-foreground xl:grid">
			{ROLES.map((r) => (
				<span
					key={r}
					id={r === role ? "role-hint" : undefined}
					aria-hidden={r === role ? undefined : true}
					className={`[grid-area:1/1] ${r === role ? "" : "invisible"}`}
				>
					{ROLE_HINTS[r]}
				</span>
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
						{/* Three columns keep the role switch centred and still while
						    the preview toggle comes and goes with the role. */}
						<div className="grid flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
							{/* _top: the docs page embeds this editor in an iframe */}
							<a
								href="/"
								target="_top"
								className="justify-self-start text-control font-medium text-muted-foreground hover:text-foreground"
							>
								Design UI docs
							</a>
							<RoleSwitch role={role} onChange={setRole} />
							<div className="flex min-w-0 items-center justify-between gap-2">
								<EditorPreviewToggle />
								<div className="ml-auto flex items-center gap-2">
									<ExportMenu />
									<ConnectAgentButton />
									<HelpMenu />
								</div>
							</div>
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
