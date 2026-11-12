import { Popover } from "@base-ui/react/popover";
import {
	aliasOf,
	indexTokens,
	isComposed,
	resolveTokenValue,
	type TokenType,
} from "@design-ui/core";
import { IconMathFunction, IconX } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { modeAt, useTokens } from "../../hooks/useTokens";
import { cn } from "../../lib/cn";
import { ColorPicker } from "../common/ColorPicker";
import { TokenComposer } from "./TokenComposer";
import { TokenIcon } from "./TokenIcon";
import { TokenGlyph, TokenList } from "./TokenList";

const popupClass =
	"ds-popup ds-surface z-50 flex w-72 flex-col p-3 outline-hidden";

/**
 * One token value: a raw value typed in (colors also through the picker, in
 * Hex, OKLCH or Display P3), or an alias to another token of the same type.
 */
export const TokenValueField = ({
	type,
	value,
	onCommit,
	exclude,
	label,
	placeholder,
	live = false,
	compact = false,
	onClear,
	previewValue,
	noCompose = false,
}: {
	type: TokenType;
	value: string;
	onCommit: (value: string) => void;
	/** The token being edited, which can't alias itself. */
	exclude?: string;
	label: string;
	placeholder?: string;
	/** Report every keystroke, for forms that save later. Otherwise on blur or Enter. */
	live?: boolean;
	/** A table cell: no background until hovered or focused. */
	compact?: boolean;
	/** Emptying the field calls this, e.g. to drop a mode's own value. */
	onClear?: () => void;
	/** What the glyph shows when the field is empty, like an inherited value. */
	previewValue?: string;
	/** Hide the fx button, e.g. inside the composer itself. */
	noCompose?: boolean;
}) => {
	const store = useTokens();
	const [linkOpen, setLinkOpen] = useState(false);
	const [colorOpen, setColorOpen] = useState(false);
	const anchorRef = useRef<HTMLDivElement>(null);
	const [composeOpen, setComposeOpen] = useState(false);
	const alias = aliasOf(value);
	const composed = isComposed(value);
	// Aliases and composed values show what they resolve to now.
	const resolved =
		alias || composed
			? resolveTokenValue(
					value,
					modeAt(store, store.breakpointOrder[0]),
					indexTokens(store.tokens),
					store.breakpointOrder,
					type
				).value
			: value;
	const shown = resolved || previewValue;

	const field = compact
		? "h-7 rounded-md px-1.5 hover:bg-input focus-within:bg-input"
		: "h-7 rounded-md bg-input px-2";

	return (
		<div
			ref={anchorRef}
			className="group/value flex min-w-0 flex-1 items-center gap-0.5"
		>
			{alias ? (
				<button
					type="button"
					aria-label={`${label}: ${alias}. Change`}
					onClick={() => setLinkOpen(true)}
					className={cn(
						"flex min-w-0 flex-1 items-center gap-1.5 text-left text-control",
						field,
						compact ? "text-accent-text" : "bg-accent/10 hover:bg-accent/15"
					)}
				>
					<TokenGlyph type={type} value={resolved} />
					<span className="min-w-0 flex-1 truncate">{alias}</span>
				</button>
			) : (
				<div className={cn("flex min-w-0 flex-1 items-center gap-1.5", field)}>
					{type === "color" ? (
						<Popover.Root open={colorOpen} onOpenChange={setColorOpen}>
							<Popover.Trigger
								aria-label={`Pick ${label}`}
								className="grid size-4 shrink-0 place-items-center rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<TokenGlyph type="color" value={shown || undefined} />
							</Popover.Trigger>
							<Popover.Portal>
								<Popover.Positioner
									anchor={anchorRef}
									side="right"
									align="start"
									sideOffset={12}
									collisionPadding={8}
								>
									<Popover.Popup className={popupClass}>
										<Popover.Title className="mb-2 text-control font-semibold">
											{label}
										</Popover.Title>
										<ColorPicker
											value={value || previewValue}
											onChange={(next) => next && onCommit(next)}
										/>
									</Popover.Popup>
								</Popover.Positioner>
							</Popover.Portal>
						</Popover.Root>
					) : (
						<TokenGlyph type={type} value={shown} />
					)}
					<input
						key={live ? undefined : value}
						aria-label={label}
						{...(live
							? { value, onChange: (event) => onCommit(event.target.value) }
							: { defaultValue: value })}
						placeholder={placeholder}
						onKeyDown={(event) => {
							if (event.key === "Enter") event.currentTarget.blur();
							if (event.key === "Escape") {
								event.currentTarget.value = value;
								event.currentTarget.blur();
							}
						}}
						onBlur={(event) => {
							if (live) return;
							const next = event.target.value.trim();
							if (!next && value && onClear) onClear();
							else if (next && next !== value) onCommit(next);
						}}
						className="min-w-0 flex-1 bg-transparent font-mono text-value outline-none placeholder:text-muted-foreground/70"
					/>
				</div>
			)}
			{!noCompose && (
				<Popover.Root open={composeOpen} onOpenChange={setComposeOpen}>
					<Popover.Trigger
						aria-label={`Compose ${label} from other tokens`}
						title="Compose from other tokens"
						className={cn(
							"grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground",
							compact &&
								!composed &&
								"opacity-0 group-hover/value:opacity-100 focus-visible:opacity-100",
							composed && "text-accent-text",
							composeOpen && "bg-selected text-foreground opacity-100"
						)}
					>
						<IconMathFunction className="size-3.5" />
					</Popover.Trigger>
					<Popover.Portal>
						<Popover.Positioner
							anchor={anchorRef}
							side="right"
							align="start"
							sideOffset={12}
							collisionPadding={8}
						>
							<Popover.Popup className={cn(popupClass, "w-80")}>
								<Popover.Title className="mb-2 text-control font-semibold">
									{label}
								</Popover.Title>
								<TokenComposer
									type={type}
									value={value}
									exclude={exclude}
									onApply={(next) => {
										onCommit(next);
										setComposeOpen(false);
									}}
								/>
							</Popover.Popup>
						</Popover.Positioner>
					</Popover.Portal>
				</Popover.Root>
			)}
			<Popover.Root open={linkOpen} onOpenChange={setLinkOpen}>
				<Popover.Trigger
					aria-label={alias ? `Unlink ${label}` : `Link ${label} to a token`}
					title={alias ? "Use its value instead" : "Point to another token"}
					onClick={(event) => {
						if (!alias) return;
						// Unlink keeps what it looked like.
						event.preventDefault();
						if (resolved) onCommit(resolved);
					}}
					className={cn(
						"grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground",
						compact &&
							"opacity-0 group-hover/value:opacity-100 focus-visible:opacity-100",
						linkOpen && "bg-selected text-foreground opacity-100"
					)}
				>
					{alias ? (
						<IconX className="size-3.5" />
					) : (
						<TokenIcon className="size-3.5" />
					)}
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Positioner
						anchor={anchorRef}
						side="right"
						align="start"
						sideOffset={12}
						collisionPadding={8}
					>
						<Popover.Popup className={popupClass}>
							<Popover.Title className="mb-2 text-control font-semibold">
								{label}
							</Popover.Title>
							<TokenList
								className="max-h-72"
								type={type}
								exclude={exclude}
								current={alias}
								onPick={(path) => {
									onCommit(`{${path}}`);
									setLinkOpen(false);
								}}
							/>
						</Popover.Popup>
					</Popover.Positioner>
				</Popover.Portal>
			</Popover.Root>
		</div>
	);
};
