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
		title: "Welcome to Design UI",
		body: (
			<>
				This editor works on one design document. The canvas, panels, rules and
				agent link are components from the Design UI packages, so you can put
				the same editor in your own app and keep the parts you need.
			</>
		),
	},
	{
		title: "Builders set the rules",
		body: (
			<>
				As a builder you can change anything. Select a layer and open Rules on
				the right to lock its structure, limit which styles can change, or allow
				only tokens. Each rule change can be undone.
			</>
		),
	},
	{
		title: "Editors work within them",
		body: (
			<>
				Switch to Editor at the top, or use Editor preview, to see what the
				rules allow. Locked controls say which rule holds them, and a blocked
				change is refused wherever it comes from: a panel, a shortcut or an
				agent.
			</>
		),
	},
	{
		title: "Every edit is logged",
		body: (
			<>
				Each change is a small JSON action, logged in Activity with who made it.
				Undo or revert any of them. Press <Key>C</Key> and click a layer to
				leave a comment or a task. Export gives you the document, or HTML and
				CSS.
			</>
		),
	},
	{
		title: "Connect an agent",
		body: (
			<>
				Connect Claude Code or any MCP client. It can read the design and its
				rules, work through the tasks you assign it, and explain each change in
				Activity. It's held to the same rules as an editor.
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
			<Dialog.Portal className="ds">
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
