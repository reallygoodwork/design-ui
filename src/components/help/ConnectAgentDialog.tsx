import { Dialog } from "@base-ui/react/dialog";
import { AGENT_PORT } from "@design-ui/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useState } from "react";
import { useAgentLink } from "../../hooks/useAgentLink";
import { cn } from "../../lib/cn";

const ADD_COMMAND = "claude mcp add coral -- bun agent/mcp-server.ts";
const SERVER_COMMAND = "bun agent/mcp-server.ts";
const FIRST_PROMPT = "Work through the open Coral design tasks.";

const CopyField = ({ value, label }: { value: string; label: string }) => {
	const [copied, setCopied] = useState(false);
	return (
		<div className="mt-1.5 flex items-center gap-1 rounded-md border border-border bg-muted py-1 pr-1 pl-2.5">
			<code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-value text-foreground">
				{value}
			</code>
			<button
				type="button"
				aria-label={label}
				onClick={() => {
					navigator.clipboard?.writeText(value).then(() => {
						setCopied(true);
						setTimeout(() => setCopied(false), 1500);
					});
				}}
				className="inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-hover hover:text-foreground"
			>
				{copied ? (
					<IconCheck className="size-3.5" aria-hidden="true" />
				) : (
					<IconCopy className="size-3.5" aria-hidden="true" />
				)}
			</button>
			<span className="sr-only" role="status">
				{copied ? "Copied" : ""}
			</span>
		</div>
	);
};

/** Where the editor stands with the agent, and what to do if it isn't there. */
const Status = () => {
	const { status, connect } = useAgentLink();
	if (status === "off") {
		return (
			<p className="text-caption text-muted-foreground">
				This copy of the editor isn't set up to reach an agent. Run it locally
				with <code className="font-mono">bun run dev</code> and open{" "}
				<code className="font-mono">/demo/</code>.
			</p>
		);
	}
	return (
		<p
			className="flex items-center gap-1.5 text-caption text-muted-foreground"
			role="status"
		>
			<span
				aria-hidden="true"
				className={cn(
					"size-1.5 rounded-full",
					status === "connected"
						? "bg-cat-image"
						: status === "connecting"
							? "bg-cat-type"
							: "bg-border-strong"
				)}
			/>
			{status === "connected"
				? "Agent connected. Assign it a task to get started."
				: status === "connecting"
					? "Looking for an agent…"
					: `No agent yet. The editor listens on port ${AGENT_PORT}.`}
			{status === "disconnected" && (
				<button
					type="button"
					onClick={connect}
					className="rounded px-1 font-medium text-foreground hover:bg-hover"
				>
					Check again
				</button>
			)}
		</p>
	);
};

/** Step-by-step setup for connecting an MCP client to this editor. */
export const ConnectAgentDialog = ({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) => (
	<Dialog.Root open={open} onOpenChange={onOpenChange}>
		<Dialog.Portal className="ds">
			<Dialog.Backdrop className="ds-backdrop fixed inset-0 z-50 bg-black/50" />
			<Dialog.Popup className="ds-dialog ds-surface ds fixed top-1/2 left-1/2 z-50 w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 p-6 font-sans">
				<Dialog.Title className="mb-2 text-heading font-semibold">
					Connect an agent
				</Dialog.Title>
				<Dialog.Description className="mb-5 text-control text-muted-foreground leading-relaxed">
					An agent can read the design, pick up tasks you assign it and change
					the design. Every change shows in Activity with its reason, and you
					can undo any of them.
				</Dialog.Description>

				<ol className="grid gap-4 text-control">
					<li>
						<p>
							<span className="font-medium">1. Add the Coral MCP server.</span>{" "}
							For Claude Code, run this from the project folder:
						</p>
						<CopyField
							value={ADD_COMMAND}
							label="Copy the Claude Code command"
						/>
						<p className="mt-1.5 text-caption text-muted-foreground">
							Using another MCP client? Give it the command{" "}
							<code className="whitespace-nowrap font-mono">
								{SERVER_COMMAND}
							</code>
							.
						</p>
					</li>
					<li>
						<p>
							<span className="font-medium">2. Assign it a task.</span> Press C,
							click a layer and choose Task. Keep “For the agent” ticked.
						</p>
					</li>
					<li>
						<p>
							<span className="font-medium">3. Ask the agent to start.</span>{" "}
							For example:
						</p>
						<CopyField value={FIRST_PROMPT} label="Copy the example prompt" />
					</li>
				</ol>

				<div className="mt-6 flex items-center gap-3 border-border border-t pt-4">
					<Status />
					<Dialog.Close className="ml-auto h-7 shrink-0 rounded-md bg-foreground px-3 font-medium text-background text-control hover:opacity-90">
						Done
					</Dialog.Close>
				</div>
			</Dialog.Popup>
		</Dialog.Portal>
	</Dialog.Root>
);
