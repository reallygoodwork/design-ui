import { Popover } from "@base-ui/react/popover";
import { type ReactNode, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { TokenIcon } from "./TokenIcon";
import { TokenGlyph } from "./TokenList";
import { type TokenBinding, TokenPicker, useBinding } from "./TokenPicker";

/** The picker beside a whole panel row, or beside the field when it has no row. */
const TokenPopover = ({
	binding,
	title,
	open,
	onOpenChange,
	anchorRef,
	children,
}: {
	binding: TokenBinding;
	title: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	anchorRef: React.RefObject<HTMLElement | null>;
	children: ReactNode;
}) => (
	<Popover.Root open={open} onOpenChange={onOpenChange}>
		{children}
		<Popover.Portal>
			<Popover.Positioner
				anchor={() =>
					anchorRef.current?.closest("[data-slot=action]") ?? anchorRef.current
				}
				sideOffset={24}
				side="left"
				align="start"
				collisionPadding={8}
			>
				<Popover.Popup className="ds-popup ds-surface z-50 w-72 p-4 outline-hidden">
					<Popover.Title className="mb-3 font-semibold text-control leading-none">
						{title}
					</Popover.Title>
					<TokenPicker binding={binding} onDone={() => onOpenChange(false)} />
				</Popover.Popup>
			</Popover.Positioner>
		</Popover.Portal>
	</Popover.Root>
);

/** The last part or two of a path, for fields too narrow for all of it. */
const shortPath = (path: string) => path.split(".").slice(-2).join(".");

/**
 * Lets any field take a design token. With a token applied, the field becomes
 * a pill naming it, which opens the token list. Without one, a link button
 * offers the list: beside the field in a panel row, or over the field's
 * letter in narrow cells like W and H. Fields with no tokens of their type
 * render unchanged.
 */
export const TokenSlot = ({
	binding,
	title,
	variant = "row",
	prefix,
	inherited = false,
	trailing,
	children,
}: {
	binding: TokenBinding;
	title: string;
	/** A panel row with its label inside the field, or a narrow cell. */
	variant?: "row" | "cell";
	/** The cell's letter or icon, kept on the pill. */
	prefix?: ReactNode;
	/** The token comes from a smaller breakpoint. */
	inherited?: boolean;
	/** Controls kept at the end of the pill, like an expand toggle. */
	trailing?: ReactNode;
	children: ReactNode;
}) => {
	const info = useBinding(binding);
	const [open, setOpen] = useState(false);
	const anchorRef = useRef<HTMLDivElement>(null);
	if (!info.hasTokens) return <>{children}</>;

	if (info.token) {
		return (
			<div ref={anchorRef} className="flex min-w-0 flex-1 items-center">
				<TokenPopover
					binding={binding}
					title={title}
					open={open}
					onOpenChange={setOpen}
					anchorRef={anchorRef}
				>
					<Popover.Trigger
						aria-label={`${title}: ${info.token.path}`}
						title={`${info.token.path} · ${info.resolved ?? ""}`}
						data-inherited={inherited || undefined}
						className={cn(
							"flex h-7 w-full min-w-0 items-center gap-1.5 rounded-md bg-accent/10 py-1 pr-1 text-control leading-none outline-none hover:bg-accent/15 focus-visible:ring-2 focus-visible:ring-ring data-inherited:outline-1 data-inherited:outline-dashed data-inherited:outline-foreground/35 data-inherited:-outline-offset-1",
							variant === "row"
								? "justify-end pl-[calc(var(--label-width,64px)+12px)]"
								: "pl-1.5"
						)}
					>
						{prefix && (
							<span className="shrink-0 text-caption text-muted-foreground [&_svg]:size-3">
								{prefix}
							</span>
						)}
						<TokenIcon
							aria-hidden="true"
							className="size-3 shrink-0 text-accent-text"
						/>
						<span
							className={cn(
								"min-w-0 truncate",
								variant === "row" && "text-right"
							)}
						>
							{variant === "cell"
								? shortPath(info.token.path)
								: info.token.path}
						</span>
						<span className="flex shrink-0 items-center pr-1">
							<TokenGlyph type={binding.type} value={info.resolved} />
						</span>
						{variant === "cell" && <span className="flex-1" />}
					</Popover.Trigger>
				</TokenPopover>
				{trailing && (
					<span className="ml-1 flex shrink-0 items-center">{trailing}</span>
				)}
			</div>
		);
	}

	const button = (
		<Popover.Trigger
			aria-label={`Use a token for ${title}`}
			title={info.match ? `Matches ${info.match.path}` : "Use a token"}
			data-open={open || undefined}
			data-match={info.match ? "" : undefined}
			className={cn(
				"grid shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity duration-150 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring data-open:opacity-100 data-match:text-accent-text data-match:opacity-100",
				variant === "row"
					? "size-7 hover:bg-hover group-hover/action:opacity-100 group-hover/slot:opacity-100 data-open:bg-selected"
					: // Over the cell's letter, so the field keeps its width.
						"absolute inset-y-0 left-0 z-10 w-6 bg-input hover:bg-hover group-hover/slot:opacity-100 data-open:bg-selected [&_svg]:size-3"
			)}
		>
			<TokenIcon className="size-3.5" />
		</Popover.Trigger>
	);

	return (
		<div
			ref={anchorRef}
			className={cn(
				"group/slot min-w-0 flex-1",
				variant === "row" ? "flex items-center gap-1" : "relative"
			)}
		>
			<div className="min-w-0 flex-1">{children}</div>
			<TokenPopover
				binding={binding}
				title={title}
				open={open}
				onOpenChange={setOpen}
				anchorRef={anchorRef}
			>
				{button}
			</TokenPopover>
		</div>
	);
};
