import { AGENT, type Rejection, type Rule } from "@design-ui/core";
import type { Action, Layer } from "@design-ui/react";
import { cn, DesignerContext, useHistory } from "@design-ui/react";
import { IconPlayerPlay, IconRefresh } from "@tabler/icons-react";
import { useContext, useEffect, useRef, useState } from "react";
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

/** What this design allows: the card's layout is fixed, and titles stay 16–32px. */
const rules: Rule[] = [
	{
		id: "card-layout",
		target: { layerIds: ["card"] },
		structure: { locked: true },
		message: "The card's layout is fixed",
	},
	{
		id: "title-size",
		target: { layerIds: ["title"] },
		values: { "--font-size": { min: 16, max: 32, unit: "px" } },
	},
];

const script: Action[] = [
	{
		type: "UPDATE_LAYER_VALUE",
		payload: { id: "title", value: "Spring launch" },
	},
	{
		type: "UPDATE_LAYER_CSS",
		payload: { id: "title", css: { "--font-size": "48px" } },
	},
	{
		type: "UPDATE_LAYER_CSS",
		payload: { id: "title", css: { "--font-size": "32px" } },
	},
	{
		type: "ADD_LAYER",
		payload: {
			layer: {
				id: "note",
				type: "text",
				name: "Note",
				value: "Ships Friday to everyone on the list.",
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
];

const STEP_MS = 900;

type Outcome = { ok: true } | { ok: false; rejection: Rejection };

const Player = () => {
	const store = useContext(DesignerContext);
	const { canUndo } = useHistory();
	const [outcomes, setOutcomes] = useState<Outcome[]>([]);
	const [running, setRunning] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => () => clearTimeout(timer.current), []);

	// Sent as the agent, so the rules apply: agents always edit as editors.
	const send = (action: Action): Outcome => {
		const rejection = store?.dispatchWithMeta(action, { actor: AGENT }) ?? null;
		return rejection ? { ok: false, rejection } : { ok: true };
	};

	const playFrom = (index: number, done: Outcome[]) => {
		if (index >= script.length) {
			setRunning(false);
			return;
		}
		const next = [...done, send(script[index])];
		setOutcomes(next);
		timer.current = setTimeout(() => playFrom(index + 1, next), STEP_MS);
	};

	const run = () => {
		setRunning(true);
		playFrom(outcomes.length, outcomes);
	};

	const reset = () => {
		clearTimeout(timer.current);
		setRunning(false);
		setOutcomes([]);
		store?.dispatch({ type: "SET_LAYERS", payload: initialLayers });
	};

	const buttonClass =
		"inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-medium text-xs disabled:opacity-40";
	const rejected = outcomes.filter((o) => !o.ok).length;

	return (
		<div className="overflow-hidden rounded-lg border border-border">
			<div className="grid min-h-56 place-items-center bg-muted p-6">
				<LayerStage className="w-full max-w-md" />
			</div>
			<div className="flex flex-wrap items-center gap-2 border-border border-y bg-background p-2">
				<button
					type="button"
					disabled={running || outcomes.length === script.length}
					onClick={run}
					className={cn(buttonClass, "bg-foreground text-background")}
				>
					<IconPlayerPlay size={13} /> Run the agent
				</button>
				<button
					type="button"
					disabled={running || !canUndo}
					onClick={() => store?.dispatch({ type: "UNDO" })}
					className={cn(buttonClass, "bg-input")}
				>
					Undo
				</button>
				<button
					type="button"
					disabled={outcomes.length === 0}
					onClick={reset}
					className={cn(buttonClass, "bg-input")}
				>
					<IconRefresh size={13} /> Reset
				</button>
				<span
					role="status"
					className="ml-auto pr-1 text-muted-foreground text-xs tabular-nums"
				>
					{outcomes.length - rejected} applied, {rejected} rejected
				</span>
			</div>
			<ol className="overflow-x-auto bg-(--ds-code) py-3 font-(family-name:--font-code) text-xs leading-6">
				{script.map((action, index) => {
					const outcome = outcomes[index];
					return (
						<li
							key={JSON.stringify(action)}
							className={cn(
								"w-fit min-w-full whitespace-nowrap px-4",
								outcome ? "text-zinc-100" : "text-zinc-500",
								outcome && !outcome.ok && "bg-red-500/25"
							)}
						>
							{JSON.stringify(action)}
							{outcome && !outcome.ok && (
								<span className="block text-red-200">
									Rejected by “{outcome.rejection.ruleId}”:{" "}
									{outcome.rejection.message}
								</span>
							)}
						</li>
					);
				})}
			</ol>
		</div>
	);
};

/** An agent's script run against a design with rules: two changes are refused. */
export const ScriptedAgent = () => (
	<Sandbox layers={initialLayers} selectedId="card" rules={rules}>
		<Player />
	</Sandbox>
);
