import {
	IconAlertOctagon,
	IconAlertTriangle,
	IconChevronRight,
	IconFileImport,
	IconPlus,
	IconSearch,
	IconTable,
} from "@tabler/icons-react";
import { type ReactNode, useMemo, useState } from "react";
import { useLayers } from "../../hooks/useLayers";
import { useTokenEditing } from "../../hooks/useTokenEditing";
import { modeAt, useTokens } from "../../hooks/useTokens";
import { cn } from "../../lib/cn";
import type { Layer } from "../../lib/Types";
import {
	indexTokens,
	resolveToken,
	type Token,
	type TokenIssue,
	type TokenTier,
	type TokenType,
	tokenFromCssValue,
} from "../../lib/tokens";
import { type Category, CategoryChip } from "../common/CategoryChip";
import { ImportCssDialog } from "./ImportCssDialog";
import { NewTokenForm } from "./NewTokenForm";
import { TokenEditor } from "./TokenEditor";
import { TIER_LABEL, TIER_ORDER, TokenGlyph } from "./TokenList";

const TYPE_META: Record<
	TokenType,
	{ label: string; category: Category; glyph: string }
> = {
	color: { label: "Color", category: "color", glyph: "●" },
	dimension: { label: "Size", category: "layout", glyph: "↔" },
	fontFamily: { label: "Font", category: "type", glyph: "Aa" },
	fontWeight: { label: "Weight", category: "type", glyph: "B" },
	number: { label: "Number", category: "layer", glyph: "#" },
	shadow: { label: "Shadow", category: "image", glyph: "◐" },
};
const TYPE_ORDER: TokenType[] = [
	"color",
	"dimension",
	"fontFamily",
	"fontWeight",
	"number",
	"shadow",
];

export const IssueIcon = ({
	severity,
}: {
	severity: TokenIssue["severity"];
}) =>
	severity === "error" ? (
		<IconAlertOctagon
			aria-label="Error"
			className="size-3.5 shrink-0 text-destructive"
		/>
	) : (
		<IconAlertTriangle
			aria-label="Warning"
			className="size-3.5 shrink-0 text-cat-type"
		/>
	);

const flatten = (layers: Layer[]): Layer[] =>
	layers.flatMap((layer) => [layer, ...flatten(layer.children ?? [])]);

const IconButton = ({
	label,
	onClick,
	children,
}: {
	label: string;
	onClick: () => void;
	children: ReactNode;
}) => (
	<button
		type="button"
		aria-label={label}
		title={label}
		onClick={onClick}
		className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground [&_svg]:size-3.5"
	>
		{children}
	</button>
);

/** One dimension's values as a row of toggle buttons. */
const ModeSwitch = ({
	dimension,
	values,
}: {
	dimension: string;
	values: string[];
}) => {
	const store = useTokens();
	return (
		// biome-ignore lint/a11y/useSemanticElements: a labelled group of toggle buttons, not a form fieldset
		<div
			role="group"
			aria-label={dimension}
			className="inline-flex h-6 rounded-md bg-input p-0.5"
		>
			{values.map((value) => (
				<button
					key={value}
					type="button"
					aria-pressed={store.mode[dimension] === value}
					onClick={() => store.setMode(dimension, value)}
					className={cn(
						"rounded-[5px] px-1.5 text-control capitalize text-muted-foreground transition-colors duration-150 hover:text-foreground",
						store.mode[dimension] === value &&
							"bg-raised text-foreground shadow-xs"
					)}
				>
					{value}
				</button>
			))}
		</div>
	);
};

/** A same-type token near a missing one, for "points at nothing". */
const nearest = (
	missing: string,
	type: TokenType,
	tokens: readonly Token[]
) => {
	const prefix = missing.split(".").slice(0, -1).join(".");
	return (
		tokens.find(
			(t) => t.type === type && prefix && t.path.startsWith(`${prefix}.`)
		) ?? tokens.find((t) => t.type === type && t.tier === "primitive")
	);
};

/**
 * The token library: every token by tier and type, searchable. Hover one to
 * outline the layers using it; open one to edit it. Problems collect at the
 * bottom, with a fix where there's an obvious one.
 */
export const TokensPane = () => {
	const store = useTokens();
	const layers = useLayers();
	const edit = useTokenEditing();
	const [tier, setTier] = useState<TokenTier>("semantic");
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState<string | null>(null);
	const [creating, setCreating] = useState(false);
	const [importing, setImporting] = useState(false);
	const [showIssues, setShowIssues] = useState(false);

	const byPath = useMemo(() => indexTokens(store.tokens), [store.tokens]);
	const mode = modeAt(store, store.breakpointOrder[0]);

	// Which layer properties reach each token, directly or through aliases.
	const usage = useMemo(() => {
		const map = new Map<string, { layer: Layer; property: string }[]>();
		for (const layer of flatten(layers)) {
			for (const [property, value] of Object.entries(layer.cssVars ?? {})) {
				const token = tokenFromCssValue(value, store.tokens);
				if (!token) continue;
				for (const path of resolveToken(
					token.path,
					mode,
					byPath,
					store.breakpointOrder
				).deps) {
					map.set(path, [...(map.get(path) ?? []), { layer, property }]);
				}
			}
		}
		return map;
	}, [layers, store.tokens, byPath, mode, store.breakpointOrder]);

	/** Shows a token: its tier, opened, scrolled into view. Works for one just created. */
	const reveal = (path: string, knownTier?: TokenTier) => {
		const tokenTier = knownTier ?? byPath.get(path)?.tier;
		if (!tokenTier) return;
		setQuery("");
		setTier(tokenTier);
		setOpen(path);
		requestAnimationFrame(() =>
			document
				.querySelector(`[data-token-path="${CSS.escape(path)}"]`)
				?.scrollIntoView?.({ block: "nearest" })
		);
	};

	const q = query.trim().toLowerCase();
	const list = store.tokens.filter((token) =>
		q ? token.path.toLowerCase().includes(q) : token.tier === tier
	);
	const types = TYPE_ORDER.filter((type) =>
		list.some((token) => token.type === type)
	);
	const errors = store.issues.filter(
		(issue) => issue.severity === "error"
	).length;
	const tierHasError = (t: TokenTier) =>
		store.issues.some(
			(issue) =>
				issue.severity === "error" && byPath.get(issue.token)?.tier === t
		);

	return (
		<div className="flex flex-col">
			<div className="flex flex-wrap items-center gap-1.5 px-3 pt-3 pb-2">
				{Object.entries(store.dimensions).map(([dimension, values]) => (
					<ModeSwitch key={dimension} dimension={dimension} values={values} />
				))}
				<span className="ml-auto flex gap-0.5">
					<IconButton
						label={store.tableOpen ? "Close token table" : "Open token table"}
						onClick={() => store.setTableOpen(!store.tableOpen)}
					>
						<IconTable />
					</IconButton>
					<IconButton
						label="Import CSS variables"
						onClick={() => setImporting(true)}
					>
						<IconFileImport />
					</IconButton>
					<IconButton label="New token" onClick={() => setCreating(true)}>
						<IconPlus />
					</IconButton>
				</span>
			</div>
			<label className="mx-2 mb-2 flex h-7 items-center gap-2 rounded-md bg-input px-2 text-control">
				<IconSearch
					aria-hidden="true"
					className="size-3.5 text-muted-foreground"
				/>
				<input
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Search tokens"
					aria-label="Search tokens"
					className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
				/>
			</label>
			{!q && (
				<nav
					aria-label="Tiers"
					className="mx-2 grid grid-cols-3 gap-0.5 rounded-md bg-muted p-[3px]"
				>
					{TIER_ORDER.map((t) => (
						<button
							key={t}
							type="button"
							aria-pressed={t === tier}
							onClick={() => setTier(t)}
							className={cn(
								"flex h-6 items-center justify-center gap-1 rounded-sm text-control text-muted-foreground hover:text-foreground",
								t === tier && "bg-raised text-foreground shadow-xs"
							)}
						>
							{TIER_LABEL[t]}
							{tierHasError(t) && (
								<span
									role="img"
									aria-label="Has errors"
									className="size-1.5 rounded-full bg-destructive"
								/>
							)}
						</button>
					))}
				</nav>
			)}

			<div className="px-1.5 py-2">
				{creating && (
					<NewTokenForm
						tier={tier}
						onDone={(created) => {
							setCreating(false);
							if (created) reveal(created.path, created.tier);
						}}
					/>
				)}
				{types.length === 0 && !creating && (
					<div className="flex flex-col items-center gap-2 px-2 py-6 text-center text-control text-muted-foreground">
						{q
							? `No tokens match “${query}”.`
							: store.tokens.length === 0
								? "No tokens yet."
								: `No ${TIER_LABEL[tier].toLowerCase()} tokens.`}
						{!q && (
							<span className="flex gap-1">
								<button
									type="button"
									onClick={() => setCreating(true)}
									className="h-7 rounded-md bg-input px-2.5 text-foreground hover:bg-hover"
								>
									New token
								</button>
								<button
									type="button"
									onClick={() => setImporting(true)}
									className="h-7 rounded-md bg-input px-2.5 text-foreground hover:bg-hover"
								>
									Import CSS
								</button>
							</span>
						)}
					</div>
				)}
				{types.map((type) => {
					const items = list.filter((token) => token.type === type);
					return (
						<section
							key={type}
							aria-label={TYPE_META[type].label}
							className="mb-2"
						>
							<h4 className="flex h-7 items-center gap-2 px-2 text-caption font-medium text-muted-foreground">
								<CategoryChip category={TYPE_META[type].category} size="sm">
									<span className="text-[9px] font-bold">
										{TYPE_META[type].glyph}
									</span>
								</CategoryChip>
								{TYPE_META[type].label}
								<span className="font-mono">{items.length}</span>
							</h4>
							<ul>
								{items.map((token) => {
									const resolved = resolveToken(
										token.path,
										mode,
										byPath,
										store.breakpointOrder
									);
									const issues = store.issues.filter(
										(issue) => issue.token === token.path
									);
									const worst =
										issues.find((issue) => issue.severity === "error") ??
										issues[0];
									const usedBy = usage.get(token.path) ?? [];
									const isOpen = open === token.path;
									return (
										<li key={token.path} data-token-path={token.path}>
											<button
												type="button"
												aria-expanded={isOpen}
												onClick={() => setOpen(isOpen ? null : token.path)}
												onMouseEnter={() => store.setHover(token.path)}
												onMouseLeave={() => store.setHover(null)}
												className={cn(
													"flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-control hover:bg-hover",
													isOpen && "bg-selected hover:bg-selected"
												)}
											>
												<TokenGlyph type={token.type} value={resolved.value} />
												<span className="min-w-0 flex-1 truncate">
													<span className="text-muted-foreground">
														{token.path.split(".")[0]}.
													</span>
													{token.path.split(".").slice(1).join(".")}
												</span>
												{usedBy.length > 0 && (
													<span
														className="shrink-0 font-mono text-value text-muted-foreground"
														title={`Used by ${usedBy.length}`}
													>
														{usedBy.length}×
													</span>
												)}
												{worst ? (
													<IssueIcon severity={worst.severity} />
												) : (
													<span className="max-w-16 shrink-0 truncate font-mono text-value">
														{resolved.value}
													</span>
												)}
											</button>
											{isOpen && (
												<TokenEditor
													token={token}
													issues={issues}
													usedBy={usedBy}
													onRenamed={(path) => setOpen(path)}
													onDeleted={() => setOpen(null)}
												/>
											)}
										</li>
									);
								})}
							</ul>
						</section>
					);
				})}
			</div>

			{store.issues.length > 0 && (
				<div className="border-t border-border">
					<button
						type="button"
						aria-expanded={showIssues}
						onClick={() => setShowIssues((s) => !s)}
						className="flex h-9 w-full items-center gap-2 px-3 text-control hover:bg-hover"
					>
						<IconChevronRight
							aria-hidden="true"
							className={cn(
								"size-3.5 transition-transform duration-150",
								showIssues && "rotate-90"
							)}
						/>
						Issues
						<span className="ml-auto flex items-center gap-1 font-mono text-value">
							<IssueIcon severity={errors ? "error" : "warning"} />
							{store.issues.length}
						</span>
					</button>
					{showIssues && (
						<ul className="flex flex-col gap-0.5 px-1.5 pb-2">
							{store.issues.map((issue) => {
								const token = byPath.get(issue.token);
								const missing = issue.id.startsWith("unresolved:")
									? issue.title.match(/\{([^}]+)\}/)?.[1]
									: undefined;
								const target =
									token && missing
										? nearest(
												missing,
												token.type,
												store.tokens.filter((t) => t.path !== token.path)
											)
										: undefined;
								return (
									<li
										key={issue.id}
										className="flex flex-col gap-1 rounded-md px-2 py-1.5 hover:bg-hover"
									>
										<button
											type="button"
											onClick={() => reveal(issue.token)}
											className="flex items-start gap-1.5 text-left text-control"
										>
											<span className="mt-px">
												<IssueIcon severity={issue.severity} />
											</span>
											<span className="min-w-0">
												<span className="font-medium">{issue.token}</span>
												<span className="text-muted-foreground">
													{" "}
													· {issue.title}
												</span>
											</span>
										</button>
										{target && token && (
											<button
												type="button"
												onClick={() =>
													edit.update(token.path, (t) => ({
														...t,
														value: `{${target.path}}`,
													}))
												}
												className="ml-5 h-6 self-start rounded-md bg-input px-2 text-caption font-medium hover:bg-background"
											>
												Point to {target.path}
											</button>
										)}
									</li>
								);
							})}
						</ul>
					)}
				</div>
			)}

			<ImportCssDialog open={importing} onOpenChange={setImporting} />
		</div>
	);
};
