import { IconPlayerPlay, IconRefresh } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import type { Action } from "../hooks/useDesigner";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useHistory } from "../hooks/useHistory";
import { cn } from "../lib/cn";
import type { Layer } from "../lib/Types";
import { LayerStage, Sandbox } from "./Sandbox";

const initialLayers: Layer[] = [
	{
		id: "card",
		type: "frame",
		name: "Card",
		value: "",
		cssVars: {
			"--background-color": "#ffffff",
			"--padding-block-start": "28px",
			"--padding-block-end": "28px",
			"--padding-inline-start": "28px",
			"--padding-inline-end": "28px",
		},
		children: [
			{
				id: "title",
				type: "text",
				name: "Title",
				value: "Untitled",
				cssVars: { "--font-size": "18px", "--color": "#18181b" },
			},
		],
	},
];

const script: Action[] = [
	{
		type: "UPDATE_LAYER_VALUE",
		payload: { id: "title", value: "Spring launch" },
	},
	{
		type: "UPDATE_LAYER_CSS",
		payload: { id: "title", css: { "--font-size": "40px" } },
	},
	{
		type: "ADD_LAYER",
		payload: {
			layer: {
				id: "note",
				type: "text",
				name: "Note",
				value: "Ships Friday to everyone on the list.",
				cssVars: { "--color": "#18181b" },
			},
			targetLayerId: "title",
			position: "after",
		},
	},
	{
		type: "UPDATE_LAYER_CSS",
		payload: { id: "card", css: { "--background-color": "#155dfc" } },
	},
	{
		type: "UPDATE_LAYER_CSS",
		payload: { id: "title", css: { "--color": "#ffffff" } },
	},
	{
		type: "UPDATE_LAYER_CSS",
		payload: { id: "note", css: { "--color": "#dbe6ff" } },
	},
];

const STEP_MS = 800;

const Player = () => {
	const dispatch = useDesignerAction();
	const { canUndo } = useHistory();
	const [applied, setApplied] = useState(0);
	const [running, setRunning] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => () => clearTimeout(timer.current), []);

	const playFrom = (index: number) => {
		if (index >= script.length) {
			setRunning(false);
			return;
		}
		dispatch(script[index]);
		setApplied(index + 1);
		timer.current = setTimeout(() => playFrom(index + 1), STEP_MS);
	};

	const run = () => {
		setRunning(true);
		playFrom(applied);
	};

	const undo = () => {
		dispatch({ type: "UNDO" });
		setApplied((count) => Math.max(0, count - 1));
	};

	const reset = () => {
		clearTimeout(timer.current);
		setRunning(false);
		setApplied(0);
		dispatch({ type: "SET_LAYERS", payload: initialLayers });
	};

	const buttonClass =
		"inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-medium text-xs disabled:opacity-40";

	return (
		<div className="overflow-hidden rounded-lg border border-border">
			<div className="grid min-h-56 place-items-center bg-muted p-6">
				<LayerStage className="w-full max-w-md" />
			</div>
			<div className="flex flex-wrap items-center gap-2 border-border border-y bg-background p-2">
				<button
					type="button"
					disabled={running || applied === script.length}
					onClick={run}
					className={cn(buttonClass, "bg-foreground text-background")}
				>
					<IconPlayerPlay size={13} /> Run the script
				</button>
				<button
					type="button"
					disabled={running || !canUndo || applied === 0}
					onClick={undo}
					className={cn(buttonClass, "bg-input")}
				>
					Undo
				</button>
				<button
					type="button"
					disabled={applied === 0}
					onClick={reset}
					className={cn(buttonClass, "bg-input")}
				>
					<IconRefresh size={13} /> Reset
				</button>
				<span className="ml-auto pr-1 text-muted-foreground text-xs tabular-nums">
					{applied} of {script.length} applied
				</span>
			</div>
			<ol className="overflow-x-auto bg-(--ds-code) py-3 font-(family-name:--font-code) text-xs leading-6">
				{script.map((action, index) => (
					<li
						key={JSON.stringify(action)}
						className={cn(
							"w-fit min-w-full whitespace-nowrap px-4",
							index < applied ? "text-zinc-100" : "text-zinc-500",
							index === applied - 1 && "bg-[#155dfc]/45"
						)}
					>
						{JSON.stringify(action)}
					</li>
				))}
			</ol>
		</div>
	);
};

export const ScriptedAgent = () => (
	<Sandbox layers={initialLayers} selectedId="card">
		<Player />
	</Sandbox>
);
