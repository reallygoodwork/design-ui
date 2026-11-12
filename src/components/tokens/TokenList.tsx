import {
	indexTokens,
	resolveToken,
	type Token,
	type TokenTier,
	type TokenType,
} from "@design-ui/core";
import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { modeAt, useTokens } from "../../hooks/useTokens";
import { cn } from "../../lib/cn";
import type { Suggestion } from "./suggest";

/** A small picture of a token's value: a swatch, a length, or "Aa". */
export const TokenGlyph = ({
	type,
	value,
}: {
	type: TokenType;
	value?: string;
}) => {
	if (type === "color") {
		return (
			<span
				aria-hidden="true"
				className="size-3 shrink-0 rounded-xs ring-1 ring-foreground/15 ring-inset"
				style={{
					background: value
						? `linear-gradient(${value}, ${value}), repeating-conic-gradient(#d4d4d8 0% 25%, #fff 0% 50%) 0 0 / 6px 6px`
						: "repeating-linear-gradient(45deg, var(--ds-destructive) 0 1px, transparent 1px 4px)",
				}}
			/>
		);
	}
	if (type === "fontFamily") {
		return (
			<span
				aria-hidden="true"
				className="w-3 shrink-0 text-center text-[11px] leading-none"
				style={{ fontFamily: value }}
			>
				Aa
			</span>
		);
	}
	if (type === "fontWeight") {
		return (
			<span
				aria-hidden="true"
				className="w-3 shrink-0 text-center text-[11px] leading-none"
				style={{ fontWeight: value }}
			>
				B
			</span>
		);
	}
	const px = Number.parseFloat(value ?? "0") || 0;
	return (
		<span aria-hidden="true" className="flex w-3 shrink-0 items-center">
			<span
				className="h-1 rounded-full bg-cat-layout/70"
				style={{ width: Math.max(2, Math.min(12, px / 6)) }}
			/>
		</span>
	);
};

export const TIER_ORDER: TokenTier[] = ["semantic", "component", "primitive"];
export const TIER_LABEL: Record<TokenTier, string> = {
	semantic: "Semantic",
	component: "Component",
	primitive: "Primitives",
};

const TYPE_NOUN: Record<TokenType, string> = {
	color: "colors",
	dimension: "sizes",
	fontFamily: "fonts",
	fontWeight: "weights",
	number: "numbers",
	shadow: "shadows",
};

/**
 * Searchable tokens of one type, grouped by tier, with each value as it
 * resolves right now. Hovering reports the token so callers can preview it.
 */
export const TokenList = ({
	type,
	current,
	match,
	onPick,
	onHover,
	className,
	exclude,
	suggest,
}: {
	type: TokenType;
	/** The token already applied, marked as selected. */
	current?: string;
	/** A token equal to the current raw value, marked as a match. */
	match?: string;
	onPick: (path: string) => void;
	onHover?: (path: string | null) => void;
	className?: string;
	/** A token to leave out, such as the one being edited. */
	exclude?: string;
	/** Tokens to list first, under their own heading, like spacing for padding. */
	suggest?: Suggestion | null;
}) => {
	const store = useTokens();
	const [query, setQuery] = useState("");
	const byPath = indexTokens(store.tokens);
	const mode = modeAt(store, store.breakpointOrder[0]);
	const q = query.trim().toLowerCase();
	const list = store.tokens.filter(
		(token) =>
			token.type === type &&
			token.path !== exclude &&
			token.path.toLowerCase().includes(q)
	);

	// Suggested tokens first, best tier first; then everything else by tier.
	const rank = (token: Token) => TIER_ORDER.indexOf(token.tier);
	const suggested = suggest
		? list
				.filter((token) => suggest.matches(token.path))
				.sort((a, b) => rank(a) - rank(b))
		: [];
	const rest = list.filter((token) => !suggested.includes(token));
	const sections = [
		...(suggested.length
			? [
					{
						key: "suggested",
						label: suggest?.label ?? "Suggested",
						items: suggested,
					},
				]
			: []),
		...TIER_ORDER.map((tier) => ({
			key: tier,
			label: suggested.length
				? `Other ${TIER_LABEL[tier].toLowerCase()}`
				: TIER_LABEL[tier],
			items: rest.filter((token) => token.tier === tier),
		})),
	];

	const row = (token: Token) => {
		const resolved = resolveToken(
			token.path,
			mode,
			byPath,
			store.breakpointOrder
		);
		return (
			<button
				key={token.path}
				type="button"
				disabled={Boolean(resolved.error)}
				aria-pressed={token.path === current}
				onClick={() => onPick(token.path)}
				onMouseEnter={() => onHover?.(token.path)}
				onFocus={() => onHover?.(token.path)}
				onMouseLeave={() => onHover?.(null)}
				onBlur={() => onHover?.(null)}
				className={cn(
					"flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-control outline-none hover:bg-hover focus-visible:bg-hover disabled:opacity-45",
					token.path === current && "bg-selected hover:bg-selected"
				)}
			>
				<TokenGlyph type={token.type} value={resolved.value} />
				<span className="min-w-0 flex-1 truncate">{token.path}</span>
				{token.path === match && (
					<span className="shrink-0 rounded bg-accent/12 px-1 text-caption text-accent-text">
						Matches
					</span>
				)}
				<span className="max-w-20 shrink-0 truncate font-mono text-value text-muted-foreground">
					{resolved.error ? "Broken" : resolved.value}
				</span>
			</button>
		);
	};

	return (
		<div className={cn("flex min-h-0 flex-col gap-1", className)}>
			<label className="flex h-7 shrink-0 items-center gap-2 rounded-md bg-input px-2 text-control">
				<IconSearch
					aria-hidden="true"
					className="size-3.5 text-muted-foreground"
				/>
				<input
					// biome-ignore lint/a11y/noAutofocus: the list opens to search it
					autoFocus
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder={`Search ${TYPE_NOUN[type]}`}
					aria-label={`Search ${TYPE_NOUN[type]}`}
					className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
				/>
			</label>
			<div className="-mx-1 min-h-0 flex-1 overflow-y-auto">
				{sections.map((section) =>
					section.items.length === 0 ? null : (
						<section key={section.key} aria-label={section.label}>
							<h5 className="px-2 pt-2 pb-1 text-caption text-muted-foreground">
								{section.label}
							</h5>
							{section.items.map(row)}
						</section>
					)
				)}
				{list.length === 0 && (
					<p className="px-2 py-4 text-center text-control text-muted-foreground">
						No {TYPE_NOUN[type]} match.
					</p>
				)}
			</div>
		</div>
	);
};
