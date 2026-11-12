import {
	IconArrowBackUp,
	IconCopy,
	IconMessagePlus,
} from "@tabler/icons-react";
import { Fragment, useContext, useState } from "react";
import { DesignerContext } from "../../context/DesignerContext";
import { useAgentLink } from "../../hooks/useAgentLink";
import { useAnnotations } from "../../hooks/useAnnotations";
import { useChangeLog } from "../../hooks/useChangeLog";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useDesignerApi } from "../../hooks/useDesignerApi";
import { useDesignerSelector } from "../../hooks/useDesignerSelector";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { useTokens } from "../../hooks/useTokens";
import type { Annotation } from "../../lib/annotations";
import { sortBreakpointsByWidth } from "../../lib/breakpointUtils";
import { type ChangeEntry, revertWrites } from "../../lib/changeLog";
import { cn } from "../../lib/cn";
import type { Token } from "../../lib/tokens";
import { useHelp } from "../help/HelpProvider";
import {
	AnnotationThread,
	Avatar,
	Composer,
	timeAgo,
	useTick,
} from "./AnnotationThread";

type Filter = "all" | "comments" | "changes";

/** Undo a logged change's values as a new change, without touching what came after. */
const useRevert = () => {
	const store = useContext(DesignerContext);
	const { setTokens } = useTokens();
	return (entry: ChangeEntry) => {
		if (entry.tokens) {
			const { before, after } = entry.tokens;
			const was = new Map(before.map((t) => [t.path, t]));
			const touched = new Set(
				[...before, ...after]
					.map((t) => t.path)
					.filter(
						(path) =>
							JSON.stringify(was.get(path)) !==
							JSON.stringify(after.find((t) => t.path === path))
					)
			);
			setTokens((current) => {
				const kept: Token[] = current.filter((t) => !touched.has(t.path));
				const restored = [...touched]
					.map((path) => was.get(path))
					.filter(Boolean) as Token[];
				return [...kept, ...restored];
			});
			return;
		}
		if (!store) return;
		const state = store.getState();
		const primary = sortBreakpointsByWidth(state.breakpoints)[0]?.id;
		if (entry.kind === "frame") {
			store.dispatch({
				type: "UPDATE_FRAME_STYLES",
				payload: {
					css: Object.fromEntries(
						entry.changes.map((c) => [c.property, c.from ?? ""])
					),
				},
			});
			return;
		}
		for (const write of revertWrites(entry)) {
			store.dispatch({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: write.layerId,
					css: write.css,
					breakpointId: write.breakpointId ?? primary,
				},
			});
		}
	};
};

const canRevert = (entry: ChangeEntry) =>
	!entry.undone && (entry.changes.length > 0 || Boolean(entry.tokens));

const ChangeRow = ({
	entry,
	notes,
}: {
	entry: ChangeEntry;
	notes: Annotation[];
}) => {
	const dispatch = useDesignerAction();
	const revert = useRevert();
	const [commenting, setCommenting] = useState(false);
	const layerName = useDesignerSelector((state) =>
		entry.layerIds[0] ? state.nodes[entry.layerIds[0]]?.name : undefined
	);

	return (
		<li
			className={cn(
				"group/change flex flex-col gap-1.5 px-2 py-2",
				entry.undone && "opacity-50"
			)}
		>
			<div className="flex items-start gap-2 text-control">
				<Avatar actor={entry.actor} />
				<div className="min-w-0 flex-1">
					<p className={cn("break-words", entry.undone && "line-through")}>
						{entry.summary}
					</p>
					{/* The why, when it isn't already a note underneath. */}
					{entry.reason && notes.length === 0 && (
						<p className="mt-0.5 border-l-2 border-cat-motion/40 pl-1.5 text-caption text-muted-foreground">
							{entry.reason}
						</p>
					)}
					<p className="flex flex-wrap items-center gap-1 text-caption text-muted-foreground">
						{entry.actor.name} · {timeAgo(entry.at)}
						{entry.undone && (
							<span className="rounded bg-input px-1">Undone</span>
						)}
						{!entry.undoable && (
							<span title="Token edits aren't in undo yet">Not in undo</span>
						)}
						{layerName && (
							<button
								type="button"
								onClick={() =>
									dispatch({
										type: "SELECT_LAYER",
										payload: { layerId: entry.layerIds[0], shiftKey: false },
									})
								}
								className="rounded bg-input px-1 hover:bg-hover"
							>
								{layerName}
							</button>
						)}
					</p>
				</div>
				<span className="flex shrink-0 gap-0.5 opacity-0 group-hover/change:opacity-100 focus-within:opacity-100">
					<button
						type="button"
						aria-label={`Comment on: ${entry.summary}`}
						title="Comment on this change"
						onClick={() => setCommenting(true)}
						className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground"
					>
						<IconMessagePlus className="size-3.5" />
					</button>
					{canRevert(entry) && (
						<button
							type="button"
							aria-label={`Revert: ${entry.summary}`}
							title="Put these values back, as a new change"
							onClick={() => revert(entry)}
							className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground"
						>
							<IconArrowBackUp className="size-3.5" />
						</button>
					)}
				</span>
			</div>
			{notes.map((note) => (
				<div key={note.id} className="ml-7">
					<AnnotationThread annotation={note} showTarget={false} />
				</div>
			))}
			{commenting && (
				<div className="ml-7">
					<Composer
						compact
						draft={{
							target: {
								kind: "change",
								entryId: entry.id,
								layerId: entry.layerIds[0],
							},
						}}
						onDone={() => setCommenting(false)}
					/>
				</div>
			)}
		</li>
	);
};

/** Whether an agent is connected, and how to connect one. */
const AgentStatusLine = () => {
	const { status, connect } = useAgentLink();
	const { openConnectAgent } = useHelp();
	if (status === "off") return null;
	const connected = status === "connected";
	return (
		<p
			className="mx-3 mb-2 flex items-center gap-1.5 text-caption text-muted-foreground"
			role="status"
		>
			<span
				aria-hidden="true"
				className={cn(
					"size-1.5 rounded-full",
					connected
						? "bg-cat-image"
						: status === "connecting"
							? "bg-cat-type"
							: "bg-border-strong"
				)}
			/>
			{connected ? (
				"Agent connected"
			) : status === "connecting" ? (
				"Looking for an agent…"
			) : (
				<>
					No agent connected
					<button
						type="button"
						onClick={connect}
						className="rounded px-1 font-medium text-foreground hover:bg-hover"
					>
						Retry
					</button>
					<button
						type="button"
						onClick={openConnectAgent}
						className="rounded px-1 font-medium text-foreground hover:bg-hover"
					>
						Set up an agent
					</button>
				</>
			)}
		</p>
	);
};

/**
 * Everything that happened to the design, newest first: changes (with who and
 * why, undone ones struck through) and the comments, notes, decisions and
 * tasks on it. Notes about a change sit under that change.
 */
export const ActivityPane = () => {
	useTick();
	const { entries } = useChangeLog();
	const { annotations, setCommentMode } = useAnnotations();
	const { exportDocument } = useDesignerApi();
	const [layer] = useSelectedLayers();
	const [filter, setFilter] = useState<Filter>("all");
	const [showResolved, setShowResolved] = useState(false);
	const [writing, setWriting] = useState(false);
	const [copied, setCopied] = useState(false);

	const byEntry = new Map<string, Annotation[]>();
	for (const a of annotations) {
		if (a.entryId)
			byEntry.set(a.entryId, [...(byEntry.get(a.entryId) ?? []), a]);
	}
	const visible = (a: Annotation) => showResolved || a.status === "open";

	type Item = { at: string; key: string; node: React.ReactNode };
	const items: Item[] = [];
	if (filter !== "comments") {
		for (const entry of entries) {
			items.push({
				at: entry.at,
				key: entry.id,
				node: (
					<ChangeRow
						entry={entry}
						notes={(byEntry.get(entry.id) ?? []).filter(visible)}
					/>
				),
			});
		}
	}
	for (const a of annotations) {
		// Under its change in the full feed; on its own when showing comments only.
		if (!visible(a) || (a.entryId && filter !== "comments")) continue;
		if (filter === "changes") continue;
		items.push({
			at: a.at,
			key: a.id,
			node: (
				<li className="px-2 py-1.5">
					<AnnotationThread annotation={a} />
				</li>
			),
		});
	}
	items.sort((a, b) => b.at.localeCompare(a.at));
	const open = annotations.filter((a) => a.status === "open").length;
	const resolvedCount = annotations.length - open;

	const copy = async () => {
		const json = JSON.stringify(exportDocument(), null, 2);
		try {
			await navigator.clipboard.writeText(json);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// Clipboard blocked: offer the file instead.
			const url = URL.createObjectURL(
				new Blob([json], { type: "application/json" })
			);
			const a = document.createElement("a");
			a.href = url;
			a.download = "design.json";
			a.click();
			URL.revokeObjectURL(url);
		}
	};

	return (
		<div className="flex flex-col">
			<div className="flex items-center gap-1 px-3 pt-3 pb-2">
				<div
					role="tablist"
					aria-label="Show"
					className="flex rounded-md bg-muted p-[3px]"
				>
					{(["all", "comments", "changes"] as const).map((f) => (
						<button
							key={f}
							type="button"
							role="tab"
							aria-selected={filter === f}
							onClick={() => setFilter(f)}
							className={cn(
								"h-6 rounded-sm px-2 text-control capitalize text-muted-foreground hover:text-foreground",
								filter === f && "bg-raised text-foreground shadow-xs"
							)}
						>
							{f}
							{f === "comments" && open > 0 && (
								<span className="ml-1 font-mono text-value opacity-70">
									{open}
								</span>
							)}
						</button>
					))}
				</div>
				<span className="flex-1" />
				<button
					type="button"
					aria-label="Copy the design as JSON"
					title={
						copied
							? "Copied"
							: "Copy the design as JSON: layers, tokens, comments and changes"
					}
					onClick={copy}
					className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground"
				>
					<IconCopy className="size-3.5" />
				</button>
			</div>

			<AgentStatusLine />
			<div className="px-2 pb-2">
				{writing ? (
					<div className="rounded-lg border border-border bg-card p-2">
						<p className="mb-1.5 text-caption text-muted-foreground">
							On {layer ? layer.name : "the document"}
						</p>
						<Composer
							draft={{
								target: layer
									? { kind: "layer", layerId: layer.id }
									: { kind: "document" },
							}}
							onDone={() => setWriting(false)}
						/>
					</div>
				) : (
					<div className="flex gap-1">
						<button
							type="button"
							onClick={() => setWriting(true)}
							className="flex h-7 flex-1 items-center gap-1.5 rounded-md bg-input px-2 text-left text-control text-muted-foreground hover:bg-hover"
						>
							<IconMessagePlus className="size-3.5" />
							Comment on {layer ? layer.name : "the document"}
						</button>
						<button
							type="button"
							onClick={() => setCommentMode(true)}
							title="Click a layer on the canvas to comment on it (C)"
							className="h-7 rounded-md px-2 text-control text-muted-foreground hover:bg-hover hover:text-foreground"
						>
							Pick…
						</button>
					</div>
				)}
			</div>

			{items.length === 0 ? (
				<p className="px-4 py-6 text-center text-control text-muted-foreground">
					Nothing yet. Changes and comments show up here as they happen.
				</p>
			) : (
				<ul aria-label="Activity" className="divide-y divide-border">
					{items.map((item) => (
						<Fragment key={item.key}>{item.node}</Fragment>
					))}
				</ul>
			)}
			{resolvedCount > 0 && (
				<button
					type="button"
					onClick={() => setShowResolved((s) => !s)}
					className="m-2 h-7 rounded-md text-control text-muted-foreground hover:bg-hover"
				>
					{showResolved ? "Hide" : "Show"} {resolvedCount} resolved
				</button>
			)}
		</div>
	);
};
