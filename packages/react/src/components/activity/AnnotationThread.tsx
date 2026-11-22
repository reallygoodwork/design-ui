import type { Actor } from "@design-ui/core";
import {
	AGENT,
	ANNOTATION_KINDS,
	type Annotation,
	type AnnotationKind,
	type AnnotationTarget,
	layerOf,
} from "@design-ui/core";
import {
	IconCheck,
	IconLoader2,
	IconRefresh,
	IconSparkles,
	IconTrash,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useAgentLink } from "../../hooks/useAgentLink";
import { type Draft, useAnnotations } from "../../hooks/useAnnotations";
import { useChangeLog } from "../../hooks/useChangeLog";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useDesignerSelector } from "../../hooks/useDesignerSelector";
import { cn } from "../../lib/cn";
import { Select } from "../common/Select";

/** "just now", "5m", "2h", then a date. */
export const timeAgo = (iso: string) => {
	const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
	if (seconds < 45) return "just now";
	if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
	if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
	return new Date(iso).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});
};

/** Re-renders now and then so relative times stay true. */
export const useTick = (ms = 30000) => {
	const [, set] = useState(0);
	useEffect(() => {
		const timer = setInterval(() => set((n) => n + 1), ms);
		return () => clearInterval(timer);
	}, [ms]);
};

export const Avatar = ({
	actor,
	size = "md",
}: {
	actor: Actor;
	size?: "sm" | "md";
}) => (
	<span
		aria-hidden="true"
		className={cn(
			"grid shrink-0 place-items-center rounded-full font-semibold",
			size === "md" ? "size-5 text-[10px]" : "size-4 text-[9px]",
			actor.kind === "agent"
				? "bg-cat-motion/20 text-cat-motion"
				: "bg-accent/15 text-accent-text"
		)}
	>
		{actor.kind === "agent" ? (
			<IconSparkles className="size-3" />
		) : (
			actor.name.slice(0, 1).toUpperCase()
		)}
	</span>
);

const KIND_TONE: Record<AnnotationKind, string> = {
	comment: "bg-input text-muted-foreground",
	note: "bg-cat-motion/14 text-cat-motion",
	decision: "bg-cat-layout/14 text-cat-layout",
	task: "bg-cat-type/14 text-cat-type",
};

export const KindBadge = ({ kind }: { kind: AnnotationKind }) => (
	<span
		className={cn(
			"rounded px-1 py-px text-[10px] font-medium uppercase tracking-wide",
			KIND_TONE[kind]
		)}
	>
		{kind}
	</span>
);

/** What an annotation is on, as a chip that takes you there. */
export const TargetChip = ({ target }: { target: AnnotationTarget }) => {
	const dispatch = useDesignerAction();
	const layerId = layerOf(target);
	const layerName = useDesignerSelector((state) =>
		layerId ? state.nodes[layerId]?.name : undefined
	);
	const label =
		target.kind === "token"
			? target.path
			: target.kind === "document"
				? "Document"
				: layerId
					? `${layerName ?? "Deleted layer"}${target.kind === "layer" && target.property ? ` · ${target.property.slice(2)}` : ""}`
					: "A change";
	return (
		<button
			type="button"
			disabled={!layerId || !layerName}
			onClick={() =>
				layerId &&
				dispatch({
					type: "SELECT_LAYER",
					payload: { layerId, shiftKey: false },
				})
			}
			className={cn(
				"max-w-36 truncate rounded bg-input px-1.5 py-px text-caption enabled:hover:bg-hover",
				target.kind === "token" && "font-mono",
				layerId && !layerName && "line-through opacity-60"
			)}
		>
			{label}
		</button>
	);
};

/** Write a comment, decision or task. */
export const Composer = ({
	draft,
	onDone,
	autoFocus = true,
	compact = false,
}: {
	draft: Draft;
	onDone: () => void;
	autoFocus?: boolean;
	compact?: boolean;
}) => {
	const { add, assign, setOpenId } = useAnnotations();
	const agent = useAgentLink();
	const [body, setBody] = useState("");
	const [kind, setKind] = useState<AnnotationKind>("comment");
	const [forAgent, setForAgent] = useState(true);
	const post = () => {
		if (!body.trim()) return;
		const id = add({ kind, target: draft.target, body: body.trim() });
		if (kind === "task" && forAgent && agent.status !== "off") {
			assign(id, AGENT);
			agent.connect();
		}
		setBody("");
		setOpenId(id);
		onDone();
	};
	return (
		<form
			aria-label="New comment"
			onSubmit={(event) => {
				event.preventDefault();
				post();
			}}
			className="flex flex-col gap-1.5"
		>
			<textarea
				// biome-ignore lint/a11y/noAutofocus: opened to write in
				autoFocus={autoFocus}
				aria-label="Comment"
				value={body}
				onChange={(event) => setBody(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) post();
					if (event.key === "Escape") onDone();
				}}
				placeholder={
					kind === "task"
						? "What should change? An agent can pick this up."
						: "Add a comment"
				}
				className={cn(
					"resize-none rounded-md bg-input p-2 text-control outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
					compact ? "h-14" : "h-16"
				)}
			/>
			<div className="flex items-center gap-1.5">
				<Select
					ariaLabel="Kind"
					className="w-28 justify-between font-sans text-control"
					value={kind}
					items={ANNOTATION_KINDS.filter((k) => k.kind !== "note").map((k) => ({
						label: k.label,
						value: k.kind,
					}))}
					onValueChange={(value) => setKind(value as AnnotationKind)}
				/>
				{kind === "task" && agent.status !== "off" && (
					<label className="flex items-center gap-1 text-caption text-muted-foreground">
						<input
							type="checkbox"
							checked={forAgent}
							onChange={(event) => setForAgent(event.target.checked)}
						/>
						For the agent
					</label>
				)}
				<span className="flex-1" />
				<button
					type="button"
					onClick={onDone}
					className="h-7 rounded-md px-2 text-control hover:bg-hover"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={!body.trim()}
					className="h-7 rounded-md bg-primary px-2.5 text-control font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
				>
					Post
				</button>
			</div>
		</form>
	);
};

/** Where a task stands with the agent, and the button that hands it over. */
const TaskStatus = ({
	assigned,
	working,
	agentStatus,
	onAssign,
	onUnassign,
	onRetry,
}: {
	assigned: boolean;
	working: boolean;
	agentStatus: ReturnType<typeof useAgentLink>["status"];
	onAssign: () => void;
	onUnassign: () => void;
	onRetry: () => void;
}) => {
	if (agentStatus === "off") return null;
	if (working) {
		return (
			<p
				className="flex items-center gap-1.5 text-caption text-cat-motion"
				role="status"
			>
				<IconLoader2
					aria-hidden="true"
					className="size-3.5 animate-spin motion-reduce:animate-none"
				/>
				The agent is working on this
			</p>
		);
	}
	if (assigned) {
		return (
			<p
				className="flex items-center gap-1.5 text-caption text-muted-foreground"
				role="status"
			>
				<IconSparkles aria-hidden="true" className="size-3.5 text-cat-motion" />
				{agentStatus === "connected"
					? "Waiting for the agent"
					: "Assigned, but no agent is connected"}
				{agentStatus !== "connected" && (
					<button
						type="button"
						onClick={onRetry}
						className="rounded px-1 font-medium text-foreground hover:bg-hover"
					>
						Retry
					</button>
				)}
				<button
					type="button"
					onClick={onUnassign}
					className="ml-auto rounded px-1 hover:bg-hover hover:text-foreground"
				>
					Unassign
				</button>
			</p>
		);
	}
	return (
		<button
			type="button"
			onClick={onAssign}
			className="flex h-6 items-center gap-1 self-start rounded-md bg-cat-motion/12 px-2 text-caption font-medium text-cat-motion hover:bg-cat-motion/20"
		>
			<IconSparkles aria-hidden="true" className="size-3.5" />
			Assign to agent
		</button>
	);
};

/** One annotation with its replies, a reply box, and resolve. */
export const AnnotationThread = ({
	annotation,
	showTarget = true,
}: {
	annotation: Annotation;
	showTarget?: boolean;
}) => {
	const { reply, setStatus, remove, assign, openId, setOpenId } =
		useAnnotations();
	const agent = useAgentLink();
	const { entries } = useChangeLog();
	const taskChanges =
		annotation.kind === "task"
			? entries.filter((e) => e.taskId === annotation.id)
			: [];
	const [draft, setDraft] = useState("");
	const resolved = annotation.status === "resolved";
	const open = openId === annotation.id;

	return (
		<article
			aria-label={`${annotation.kind} by ${annotation.author.name}`}
			data-open={open || undefined}
			className={cn(
				"group/thread flex flex-col gap-1.5 rounded-lg border border-border bg-card p-2.5 text-control data-open:ring-2 data-open:ring-accent/40",
				resolved && "opacity-60"
			)}
		>
			<header className="flex items-center gap-1.5">
				<Avatar actor={annotation.author} />
				<span className="font-medium">{annotation.author.name}</span>
				<KindBadge kind={annotation.kind} />
				<span className="ml-auto text-caption text-muted-foreground">
					{timeAgo(annotation.at)}
				</span>
			</header>
			{showTarget && (
				<div>
					<TargetChip target={annotation.target} />
				</div>
			)}
			<p className="whitespace-pre-wrap">{annotation.body}</p>
			{annotation.kind === "task" && !resolved && (
				<TaskStatus
					assigned={annotation.assignedTo?.kind === "agent"}
					working={annotation.claimedBy?.kind === "agent"}
					agentStatus={agent.status}
					onAssign={() => {
						assign(annotation.id, AGENT);
						agent.connect();
					}}
					onUnassign={() => assign(annotation.id, undefined)}
					onRetry={agent.connect}
				/>
			)}
			{taskChanges.length > 0 && (
				<ul
					aria-label="Changes for this task"
					className="flex flex-col gap-0.5 rounded-md bg-input/60 p-1.5 text-caption"
				>
					{taskChanges.map((change) => (
						<li
							key={change.id}
							className={cn(
								"flex gap-1.5",
								change.undone && "line-through opacity-60"
							)}
						>
							<IconSparkles
								aria-hidden="true"
								className="mt-0.5 size-3 shrink-0 text-cat-motion"
							/>
							{change.summary}
						</li>
					))}
				</ul>
			)}
			{annotation.replies.map((r) => (
				<div key={r.id} className="flex gap-1.5 border-l-2 border-border pl-2">
					<Avatar actor={r.author} size="sm" />
					<div className="min-w-0">
						<span className="text-caption text-muted-foreground">
							{r.author.name} · {timeAgo(r.at)}
						</span>
						<p className="whitespace-pre-wrap">{r.body}</p>
					</div>
				</div>
			))}
			{!resolved && (
				<form
					onSubmit={(event) => {
						event.preventDefault();
						if (!draft.trim()) return;
						reply(annotation.id, draft.trim());
						setDraft("");
					}}
					onFocus={() => setOpenId(annotation.id)}
				>
					<input
						aria-label="Reply"
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						placeholder="Reply"
						className="h-7 w-full rounded-md bg-input px-2 text-control outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
					/>
				</form>
			)}
			<footer className="flex items-center gap-1">
				<button
					type="button"
					onClick={() =>
						setStatus(annotation.id, resolved ? "open" : "resolved")
					}
					className="flex h-6 items-center gap-1 rounded-md px-1.5 text-caption font-medium hover:bg-hover"
				>
					{resolved ? (
						<IconRefresh className="size-3.5" />
					) : (
						<IconCheck className="size-3.5" />
					)}
					{resolved ? "Reopen" : "Resolve"}
				</button>
				<span className="flex-1" />
				<button
					type="button"
					aria-label="Delete"
					onClick={() => {
						if (open) setOpenId(null);
						remove(annotation.id);
					}}
					className="grid size-6 place-items-center rounded-md text-muted-foreground opacity-0 hover:bg-hover hover:text-destructive group-hover/thread:opacity-100 focus-visible:opacity-100"
				>
					<IconTrash className="size-3.5" />
				</button>
			</footer>
		</article>
	);
};
