import { Dialog } from "@base-ui/react/dialog";
import { useState } from "react";
import { cn } from "../../lib/cn";

const Key = ({ children }: { children: string }) => (
	<kbd className="rounded border border-border bg-muted px-1 font-mono text-value text-foreground">
		{children}
	</kbd>
);

const STEPS = [
	{
		title: "Welcome to Coral Design",
		body: (
			<>
				Design one page at every screen size. Each frame on the canvas shows the
				same layers at a different width, so you see mobile, tablet and desktop
				side by side.
			</>
		),
	},
	{
		title: "Select a layer, then style it",
		body: (
			<>
				Click a layer on the canvas or in Layers. Change it in Styles on the
				right, or read the CSS it produces in the CSS tab. Tokens holds the
				colors and spacing every layer can share.
			</>
		),
	},
	{
		title: "Add layers from the keyboard",
		body: (
			<>
				Press <Key>F</Key> for a frame, <Key>T</Key> for text or <Key>I</Key>{" "}
				for an image. The new layer goes after the one you selected. Arrow keys
				move a positioned layer; hold <Key>Shift</Key> to move it 10px.
			</>
		),
	},
	{
		title: "Comment, or leave a task",
		body: (
			<>
				Press <Key>C</Key> and click a layer to comment on it. Turn a comment
				into a task, and it waits in Activity until someone, or an agent,
				resolves it.
			</>
		),
	},
	{
		title: "Work with an agent",
		body: (
			<>
				Connect Claude Code or any MCP client, and it can read the design, work
				through your tasks and explain each change in Activity. You can undo
				anything it does.
			</>
		),
	},
];

/** A short tour of the editor. Shows on the first visit and from Help. */
export const WelcomeDialog = ({
	open,
	onOpenChange,
	onConnectAgent,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConnectAgent: () => void;
}) => {
	const [step, setStep] = useState(0);
	const last = step === STEPS.length - 1;
	const { title, body } = STEPS[step];

	return (
		<Dialog.Root
			open={open}
			onOpenChange={(next) => {
				onOpenChange(next);
				if (!next) setStep(0);
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className="ds-backdrop fixed inset-0 z-50 bg-black/50" />
				<Dialog.Popup className="ds-dialog ds-surface ds fixed top-1/2 left-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 p-6 font-sans">
					<p className="mb-2 text-caption text-muted-foreground">
						{step + 1} of {STEPS.length}
					</p>
					<Dialog.Title className="mb-2 text-heading font-semibold">
						{title}
					</Dialog.Title>
					<Dialog.Description className="min-h-24 text-control text-muted-foreground leading-relaxed">
						{body}
					</Dialog.Description>

					<div className="mt-6 flex items-center gap-2">
						<div className="flex gap-1" aria-hidden="true">
							{STEPS.map((s, i) => (
								<span
									key={s.title}
									className={cn(
										"size-1.5 rounded-full",
										i === step ? "bg-foreground" : "bg-border-strong"
									)}
								/>
							))}
						</div>
						<div className="ml-auto flex gap-2">
							{step === 0 ? (
								<Dialog.Close className="h-7 rounded-md px-3 text-control text-muted-foreground hover:bg-hover hover:text-foreground">
									Skip tour
								</Dialog.Close>
							) : (
								<button
									type="button"
									onClick={() => setStep(step - 1)}
									className="h-7 rounded-md px-3 text-control text-muted-foreground hover:bg-hover hover:text-foreground"
								>
									Back
								</button>
							)}
							{last ? (
								<>
									<Dialog.Close className="h-7 rounded-md px-3 text-control hover:bg-hover">
										Done
									</Dialog.Close>
									<button
										type="button"
										onClick={onConnectAgent}
										className="h-7 rounded-md bg-foreground px-3 font-medium text-background text-control hover:opacity-90"
									>
										Connect an agent
									</button>
								</>
							) : (
								<button
									type="button"
									onClick={() => setStep(step + 1)}
									className="h-7 rounded-md bg-foreground px-3 font-medium text-background text-control hover:opacity-90"
								>
									{step === 0 ? "Get started" : "Next"}
								</button>
							)}
						</div>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
