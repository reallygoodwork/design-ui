import { type TokenType, tokenCssValue } from "@design-ui/core";
import { type ReactNode, useEffect, useState } from "react";
import { useDesignerSelector } from "../../hooks/useDesignerSelector";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { useTokens, useTokenValue } from "../../hooks/useTokens";
import { cn } from "../../lib/cn";
import { suggestionFor } from "./suggest";
import { DetachTokenIcon, TokenIcon } from "./TokenIcon";
import { TokenList } from "./TokenList";

export type TokenBinding = {
	type: TokenType;
	/** The property, for previewing a token on the canvas. Several, comma-separated, preview together. */
	cssProperty: string;
	/** Not a layer property (like frame styles), so there's nothing to preview on. */
	noPreview?: boolean;
	/** The value the layer holds: `var(--token)` or a raw value. */
	value: string | undefined;
	/** Writes a new value: `var(--token)` to apply one, a raw value to detach. */
	onChange: (value: string) => void;
};

/** What a token-aware field shows: the token it uses and that token's value here. */
export const useBinding = (binding: TokenBinding | undefined) => {
	const activeBreakpointId = useDesignerSelector(
		(state) => state.activeBreakpointId
	);
	return useTokenValue(
		binding?.value,
		binding?.type ?? "color",
		activeBreakpointId
	);
};

/**
 * The inside of a value popover with tokens: Custom | Tokens tabs, a note when
 * a token is in use with a way to detach it, and the list of tokens that fit.
 * It opens on Tokens when the value is a token or matches one.
 */
export const TokenPicker = ({
	binding,
	custom,
	onDone,
}: {
	binding: TokenBinding;
	/** The ordinary editor for a raw value. Without it there are no tabs. */
	custom?: ReactNode;
	onDone: () => void;
}) => {
	const store = useTokens();
	const [layer] = useSelectedLayers();
	const info = useBinding(binding);
	const [tab, setTab] = useState<"custom" | "tokens">(
		!custom || info.token || info.match ? "tokens" : "custom"
	);

	// Nothing stays previewed after the popover closes.
	const { setPreview } = store;
	useEffect(() => () => setPreview(null), [setPreview]);

	const preview = (path: string | null) =>
		setPreview(
			path && layer && !binding.noPreview
				? { layerId: layer.id, cssProperty: binding.cssProperty, path }
				: null
		);

	return (
		<div className="flex min-h-0 flex-col gap-2">
			{custom && (
				<div
					role="tablist"
					aria-label="Value source"
					className="grid grid-cols-2 rounded-md bg-muted p-[3px]"
				>
					{(["custom", "tokens"] as const).map((value) => (
						<button
							key={value}
							type="button"
							role="tab"
							aria-selected={tab === value}
							onClick={() => setTab(value)}
							className={cn(
								"h-6 rounded-sm text-control capitalize text-muted-foreground hover:text-foreground",
								tab === value && "bg-raised text-foreground shadow-xs"
							)}
						>
							{value}
						</button>
					))}
				</div>
			)}
			{info.token && (
				<div className="flex items-center gap-1.5 rounded-md bg-accent/10 px-2 py-1.5 text-caption">
					<TokenIcon
						aria-hidden="true"
						className="size-3 shrink-0 text-accent-text"
					/>
					<span className="min-w-0 flex-1 truncate">
						<span className="font-medium">{info.token.path}</span>
						<span className="text-muted-foreground"> · {info.resolved}</span>
					</span>
					<button
						type="button"
						title="Keep the value, stop using the token"
						onClick={() => info.resolved && binding.onChange(info.resolved)}
						className="flex shrink-0 items-center gap-1 rounded px-1 py-0.5 font-medium hover:bg-hover"
					>
						<DetachTokenIcon aria-hidden="true" className="size-3" />
						Detach
					</button>
				</div>
			)}
			{tab === "tokens" ? (
				<TokenList
					suggest={suggestionFor(binding.cssProperty)}
					className="max-h-72"
					type={binding.type}
					current={info.token?.path}
					match={info.match?.path}
					onHover={preview}
					onPick={(path) => {
						binding.onChange(tokenCssValue(path));
						setPreview(null);
						onDone();
					}}
				/>
			) : (
				custom
			)}
		</div>
	);
};
