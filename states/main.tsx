import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BreakpointSwitcher } from "../src/components/BreakpointSwitcher";
import { Designer } from "../src/components/Designer";
import { DesignerPane } from "../src/components/DesignerPane";
import { ThemeProvider } from "../src/components/theme-provider";
import { useDesignerAction } from "../src/hooks/useDesignerAction";
import "../src/index.css";
import { breakpoints, type InputState, STATES } from "./fixtures";
import { Switcher } from "./Switcher";
import "./switcher.css";

const readState = () => {
	const id = new URLSearchParams(location.search).get("__state");
	return STATES.find((s) => s.id === id) ?? STATES[0];
};

/** Select the layer at the state's breakpoint, through the app's own actions. */
const Seed = ({ state }: { state: InputState }) => {
	const dispatch = useDesignerAction();
	useEffect(() => {
		const breakpointId = state.breakpoint ?? "mobile";
		dispatch({
			type: "SELECT_LAYER",
			payload: { layerId: "L", shiftKey: false, breakpointId },
		});
		dispatch({ type: "SET_ACTIVE_BREAKPOINT", payload: { breakpointId } });
	}, [dispatch, state]);
	return null;
};

const Stage = ({ state }: { state: InputState }) => (
	<Designer
		key={state.id}
		breakpoints={breakpoints}
		defaultLayers={[
			{
				id: "L",
				type: state.layerType ?? "frame",
				name: state.layerType === "text" ? "Hero headline" : "Card",
				value:
					state.layerType === "text" ? "Field notes from a small studio" : "",
				cssVars: state.cssVars ?? {},
				breakpointCssVars: state.breakpointCssVars,
			},
		]}
	>
		<Seed state={state} />
		{/* Same width and surface as the production inspector panel */}
		<div className="w-[260px] bg-background border-l border-border">
			<BreakpointSwitcher />
			<DesignerPane title={state.pane}>
				{state.controls.map((Control) => (
					<Control key={Control.name} />
				))}
			</DesignerPane>
		</div>
	</Designer>
);

const Page = () => {
	const [state, setState] = useState(readState);
	useEffect(() => {
		const sync = () => setState(readState());
		addEventListener("popstate", sync);
		return () => removeEventListener("popstate", sync);
	}, []);
	const go = (id: string) => {
		const url = new URL(location.href);
		url.searchParams.set("__state", id);
		history.replaceState(null, "", url);
		setState(readState());
	};
	return (
		<div className="state-page">
			<div className="state-layout">
				<Switcher states={STATES} active={state.id} onChange={go} />
				<div className="state-stage">
					<Stage state={state} />
				</div>
			</div>
		</div>
	);
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<ThemeProvider>
			<Page />
		</ThemeProvider>
	</React.StrictMode>
);
