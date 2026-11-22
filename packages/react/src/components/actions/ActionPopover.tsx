import { Popover } from "@base-ui/react/popover";
import { type ReactNode, useRef, useState } from "react";
import { usePropertyAccess } from "../../hooks/useAllowed";
import { cn } from "../../lib/cn";
import { DesignAction } from "../DesignAction";
import { TokenIcon } from "../tokens/TokenIcon";
import { TokenGlyph } from "../tokens/TokenList";
import {
	type TokenBinding,
	TokenPicker,
	useBinding,
} from "../tokens/TokenPicker";

interface ActionPopoverProps {
	label: string;
	popoverTitle: string;
	triggerDisplayValue: string;
	hasValue?: boolean;
	/** The value shown comes from a smaller breakpoint. */
	inherited?: boolean;
	onClear?: () => void;
	showSwatch?: boolean;
	swatchColor?: string;
	children: ReactNode;
	onOpenChange?: (open: boolean) => void;
	/** The CSS property this row edits, for showing it across breakpoints. */
	property?: string;
	/** Lets the value be a design token, picked from a Tokens tab. */
	token?: TokenBinding;
}

export const ActionPopover = ({
	label,
	popoverTitle,
	triggerDisplayValue,
	hasValue = false,
	inherited = false,
	onClear,
	showSwatch = false,
	swatchColor,
	children,
	onOpenChange,
	property,
	token,
}: ActionPopoverProps) => {
	const { tokensOnly } = usePropertyAccess(property);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const [open, setOpen] = useState(false);
	const info = useBinding(token);
	const withTokens = Boolean(token && info.hasTokens);
	const bound = withTokens ? info.token : undefined;

	const changeOpen = (next: boolean) => {
		setOpen(next);
		onOpenChange?.(next);
	};

	return (
		<DesignAction
			label={label}
			property={property}
			clear={onClear ? { hasValue: Boolean(hasValue), onClear } : undefined}
		>
			<Popover.Root open={open} onOpenChange={changeOpen}>
				<Popover.Trigger
					ref={triggerRef}
					title={
						bound
							? `${bound.path} · ${info.resolved ?? ""}`
							: triggerDisplayValue || undefined
					}
					className="flex h-7 w-full min-w-0 items-center justify-end gap-1.5 rounded-md bg-input py-1 pr-2 pl-[calc(var(--label-width,64px)+12px)] text-control leading-none outline-none hover:bg-input/80 focus-visible:ring-2 focus-visible:ring-ring data-inherited:outline-1 data-inherited:outline-dashed data-inherited:outline-foreground/35 data-inherited:-outline-offset-1 data-token:bg-accent/10 data-token:hover:bg-accent/15"
					data-empty={!hasValue}
					data-inherited={inherited || undefined}
					data-token={bound ? "" : undefined}
				>
					{bound ? (
						<>
							<TokenIcon
								aria-label="Token"
								className="size-3 shrink-0 text-accent-text"
							/>
							<span className="min-w-0 truncate text-right text-control">
								{bound.path}
								{inherited && <span className="sr-only"> (inherited)</span>}
							</span>
							{showSwatch && <TokenGlyph type="color" value={info.resolved} />}
						</>
					) : (
						<>
							<span
								className={cn(
									"min-w-0 truncate text-right font-mono text-value",
									hasValue ? "text-foreground" : "text-muted-foreground"
								)}
							>
								{triggerDisplayValue || "None"}
								{inherited && <span className="sr-only"> (inherited)</span>}
							</span>
							{showSwatch && swatchColor && (
								<TokenGlyph type="color" value={swatchColor} />
							)}
						</>
					)}
				</Popover.Trigger>
				<Popover.Portal className="ds">
					<Popover.Positioner
						// Beside the whole row, so it opens just outside the panel
						anchor={() =>
							triggerRef.current?.closest("[data-slot=action]") ??
							triggerRef.current
						}
						sideOffset={24}
						side="left"
						align="start"
						collisionPadding={8}
					>
						<Popover.Popup
							className={cn(
								"ds-popup ds-surface z-50 p-4 outline-hidden",
								withTokens ? "w-72" : "w-64"
							)}
						>
							<div className="flex flex-col gap-1 text-center sm:text-left">
								<Popover.Title className="font-semibold text-control leading-none">
									{popoverTitle}
								</Popover.Title>
							</div>
							<div className="mt-3 flex w-full flex-col gap-1">
								{token && withTokens ? (
									<TokenPicker
										binding={token}
										onDone={() => changeOpen(false)}
										// Tokens only, by the editing rules: no custom values.
										custom={
											tokensOnly ? undefined : (
												<div className="flex w-full flex-col gap-1">
													{children}
												</div>
											)
										}
									/>
								) : (
									children
								)}
							</div>
						</Popover.Popup>
					</Popover.Positioner>
				</Popover.Portal>
			</Popover.Root>
		</DesignAction>
	);
};
