import {
	IconArrowsDiagonal,
	IconArrowsDiagonalMinimize2,
	IconPlus,
	IconSearch,
	IconX,
} from "@tabler/icons-react";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { useTokenEditing } from "../../hooks/useTokenEditing";
import { useTokens } from "../../hooks/useTokens";
import { cn } from "../../lib/cn";
import { modeNameProblem, setModeValue } from "../../lib/tokenEdits";
import {
	BREAKPOINT_DIMENSION,
	indexTokens,
	resolveToken,
	type Token,
	type TokenTier,
	type TokenType,
} from "../../lib/tokens";
import { Select } from "../common/Select";
import { TokenGraph } from "./TokenGraph";
import { TIER_LABEL, TIER_ORDER, TokenGlyph } from "./TokenList";
import { TokenValueField } from "./TokenValueField";
import { useDrawerSize } from "./useDrawerSize";

const TYPE_LABEL: Record<TokenType, string> = {
	color: "Color",
	dimension: "Size",
	fontFamily: "Font",
	fontWeight: "Weight",
	number: "Number",
	shadow: "Shadow",
};
const TYPE_ORDER: TokenType[] = [
	"color",
	"dimension",
	"fontFamily",
	"fontWeight",
	"number",
	"shadow",
];

/** A name typed in place: Enter saves, Escape or an empty name cancels. */
const NameInput = ({
	initial = "",
	label,
	taken,
	placeholder,
	onSave,
	onCancel,
}: {
	initial?: string;
	label: string;
	taken: readonly string[];
	placeholder?: string;
	onSave: (name: string) => void;
	onCancel: () => void;
}) => {
	const [name, setName] = useState(initial);
	const problem = name === initial ? null : modeNameProblem(name, taken);
	const save = () => {
		if (!name.trim() || name === initial) onCancel();
		else if (!problem) onSave(name.trim());
	};
	return (
		<input
			// biome-ignore lint/a11y/noAutofocus: shown to be typed into
			autoFocus
			aria-label={label}
			aria-invalid={Boolean(problem)}
			title={problem ?? undefined}
			value={name}
			placeholder={placeholder}
			onChange={(event) => setName(event.target.value)}
			onKeyDown={(event) => {
				if (event.key === "Enter") save();
				if (event.key === "Escape") onCancel();
			}}
			onBlur={save}
			className="h-6 w-28 min-w-0 rounded bg-input px-1.5 text-control outline-none ring-1 ring-ring aria-invalid:ring-destructive"
		/>
	);
};

/** A button that asks once more before doing something destructive. */
const ConfirmButton = ({
	label,
	onConfirm,
}: {
	label: string;
	onConfirm: () => void;
}) => {
	const [asking, setAsking] = useState(false);
	return (
		<button
			type="button"
			aria-label={asking ? `Confirm: ${label}` : label}
			title={asking ? "Click again to delete" : label}
			onClick={() => (asking ? onConfirm() : setAsking(true))}
			onBlur={() => setAsking(false)}
			className={cn(
				"grid h-5 shrink-0 place-items-center rounded px-0.5 text-muted-foreground opacity-0 group-hover/head:opacity-100 hover:bg-hover hover:text-destructive focus-visible:opacity-100",
				asking &&
					"bg-destructive/12 px-1.5 text-caption text-destructive opacity-100"
			)}
		>
			{asking ? "Delete?" : <IconX className="size-3" />}
		</button>
	);
};

/**
 * Every token against every value of one mode set, under the canvas. Each
 * cell is that token's value in that mode; an empty cell uses the default.
 * The header is where themes and other mode sets are added and renamed.
 */
export const TokenTable = () => {
	const store = useTokens();
	const edit = useTokenEditing();
	const panelRef = useRef<HTMLElement>(null);
	const drawer = useDrawerSize(panelRef);
	const dimensionNames = [
		...Object.keys(store.dimensions),
		BREAKPOINT_DIMENSION,
	];
	const [chosenDimension, setDimension] = useState(dimensionNames[0]);
	const dimension = dimensionNames.includes(chosenDimension)
		? chosenDimension
		: dimensionNames[0];
	const isBreakpoint = dimension === BREAKPOINT_DIMENSION;
	const values = isBreakpoint
		? store.breakpointOrder
		: (store.dimensions[dimension] ?? []);
	const [view, setView] = useState<"table" | "graph">("table");
	const [tier, setTier] = useState<TokenTier | "all">("all");
	const [query, setQuery] = useState("");
	const [renaming, setRenaming] = useState<string | null>(null);
	const [adding, setAdding] = useState<"value" | "dimension" | null>(null);

	const byPath = useMemo(() => indexTokens(store.tokens), [store.tokens]);
	const q = query.trim().toLowerCase();
	const rows = store.tokens.filter(
		(token) =>
			(tier === "all" || token.tier === tier) &&
			token.path.toLowerCase().includes(q)
	);

	if (!store.tableOpen) return null;

	/** The mode a column shows: the canvas's, with this column's value. */
	const modeFor = (value: string) => ({
		...store.mode,
		[BREAKPOINT_DIMENSION]: isBreakpoint
			? value
			: (store.breakpointOrder[0] ?? ""),
		...(isBreakpoint ? {} : { [dimension]: value }),
	});

	const cell = (token: Token, value: string, index: number): ReactNode => {
		const resolved = resolveToken(
			token.path,
			modeFor(value),
			byPath,
			store.breakpointOrder
		);
		const label = `${token.path} ${index === 0 ? "default" : value}`;
		const field =
			index === 0 ? (
				<TokenValueField
					compact
					label={label}
					type={token.type}
					value={token.value}
					exclude={token.path}
					onCommit={(next) =>
						edit.update(token.path, (t) => ({ ...t, value: next }))
					}
				/>
			) : (
				<TokenValueField
					compact
					label={label}
					type={token.type}
					value={
						(token.modes ?? []).find((entry) => {
							const keys = Object.keys(entry.when);
							return keys.length === 1 && entry.when[dimension] === value;
						})?.value ?? ""
					}
					placeholder={token.value}
					previewValue={resolved.value}
					exclude={token.path}
					onCommit={(next) =>
						edit.update(token.path, (t) =>
							setModeValue(t, { [dimension]: value }, next)
						)
					}
					onClear={() =>
						edit.update(token.path, (t) =>
							setModeValue(t, { [dimension]: value }, null)
						)
					}
				/>
			);
		return (
			<td
				key={value}
				className={cn(
					"h-8 border-b border-l border-border px-1",
					!isBreakpoint &&
						store.mode[dimension] === value &&
						"bg-accent/[0.04]",
					resolved.error && "bg-destructive/[0.07]"
				)}
			>
				{field}
			</td>
		);
	};

	return (
		<section
			ref={panelRef}
			aria-label="Token table"
			style={drawer.style}
			className={cn(
				"relative z-20 flex shrink-0 flex-col border-t border-border bg-background",
				// Snap and toggle animate; following the pointer doesn't.
				!drawer.dragging &&
					"transition-[height] duration-200 ease-(--ease-out) motion-reduce:transition-none",
				drawer.pending === "close" && "opacity-60"
			)}
		>
			{/* biome-ignore lint/a11y/useSemanticElements: a focusable splitter; <hr> can't take focus or keys */}
			<div
				role="separator"
				tabIndex={0}
				aria-label="Resize token panel"
				aria-orientation="horizontal"
				aria-valuenow={drawer.percent}
				aria-valuemin={0}
				aria-valuemax={100}
				title="Drag to resize · double-click for full view"
				{...drawer.handleProps}
				className="group/handle absolute inset-x-0 -top-1.5 z-30 flex h-3 cursor-row-resize touch-none items-center justify-center outline-none"
			>
				<span
					className={cn(
						"h-1 w-10 rounded-full bg-border-strong opacity-0 transition-opacity duration-150 group-hover/handle:opacity-100 group-focus-visible/handle:opacity-100",
						(drawer.dragging || drawer.pending) && "opacity-100",
						drawer.pending === "full" && "w-16 bg-accent"
					)}
				/>
			</div>
			<div className="flex h-10 [scrollbar-width:none] shrink-0 items-center gap-2 overflow-x-auto whitespace-nowrap border-b border-border px-3 [&>*]:shrink-0">
				<span className="text-title">Tokens</span>
				<div
					role="tablist"
					aria-label="View"
					className="flex rounded-md bg-muted p-[3px]"
				>
					{(["table", "graph"] as const).map((v) => (
						<button
							key={v}
							type="button"
							role="tab"
							aria-selected={view === v}
							onClick={() => setView(v)}
							className={cn(
								"h-6 rounded-sm px-2 text-control capitalize text-muted-foreground hover:text-foreground",
								view === v && "bg-raised text-foreground shadow-xs"
							)}
						>
							{v}
						</button>
					))}
				</div>
				{view === "table" && (
					<>
						<span className="text-caption text-muted-foreground">
							Columns by
						</span>
						{/* biome-ignore lint/a11y/useSemanticElements: a labelled group of toggle buttons, not a form fieldset */}
						<div
							className="flex items-center gap-0.5"
							role="group"
							aria-label="Mode sets"
						>
							{dimensionNames.map((name) => {
								const editable = name !== BREAKPOINT_DIMENSION;
								if (renaming === `dim:${name}`) {
									return (
										<NameInput
											key={name}
											initial={name}
											label={`Rename ${name}`}
											taken={dimensionNames}
											onCancel={() => setRenaming(null)}
											onSave={(to) => {
												edit.modes.renameDimension(name, to);
												setDimension(to);
												setRenaming(null);
											}}
										/>
									);
								}
								return (
									<span key={name} className="group/head flex items-center">
										<button
											type="button"
											aria-pressed={name === dimension}
											title={
												editable
													? "Double-click to rename"
													: "Breakpoints come from the frames"
											}
											onClick={() => setDimension(name)}
											onDoubleClick={() =>
												editable && setRenaming(`dim:${name}`)
											}
											className={cn(
												"h-6 rounded-md px-2 text-control capitalize text-muted-foreground hover:text-foreground",
												name === dimension && "bg-selected text-foreground"
											)}
										>
											{name}
										</button>
										{editable && name === dimension && (
											<ConfirmButton
												label={`Delete the ${name} set and its values`}
												onConfirm={() => edit.modes.removeDimension(name)}
											/>
										)}
									</span>
								);
							})}
							{adding === "dimension" ? (
								<NameInput
									label="New mode set name"
									placeholder="contrast"
									taken={dimensionNames}
									onCancel={() => setAdding(null)}
									onSave={(name) => {
										edit.modes.addDimension(name, ["default"]);
										setDimension(name);
										setAdding("value");
									}}
								/>
							) : (
								<button
									type="button"
									onClick={() => setAdding("dimension")}
									className="flex h-6 items-center gap-1 rounded-md px-1.5 text-control text-muted-foreground hover:bg-hover hover:text-foreground"
								>
									<IconPlus className="size-3.5" />
									Mode set
								</button>
							)}
						</div>
					</>
				)}
				<div className="ml-auto flex items-center gap-2">
					{view === "table" && (
						<>
							<Select
								ariaLabel="Tier"
								className="w-32 justify-between font-sans text-control"
								value={tier}
								items={[
									{ label: "All tiers", value: "all" },
									...TIER_ORDER.map((t) => ({
										label: TIER_LABEL[t],
										value: t,
									})),
								]}
								onValueChange={(value) => setTier(value as TokenTier | "all")}
							/>
							<label className="flex h-7 w-44 items-center gap-2 rounded-md bg-input px-2 text-control">
								<IconSearch
									aria-hidden="true"
									className="size-3.5 text-muted-foreground"
								/>
								<input
									aria-label="Search tokens"
									value={query}
									onChange={(event) => setQuery(event.target.value)}
									placeholder="Search"
									className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
								/>
							</label>
						</>
					)}
					<button
						type="button"
						aria-label={drawer.maximized ? "Show the canvas" : "Full view"}
						title={drawer.maximized ? "Show the canvas" : "Full view"}
						aria-pressed={drawer.maximized}
						onClick={drawer.toggleMaximized}
						className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground"
					>
						{drawer.maximized ? (
							<IconArrowsDiagonalMinimize2 className="size-4" />
						) : (
							<IconArrowsDiagonal className="size-4" />
						)}
					</button>
					<button
						type="button"
						aria-label="Close token table"
						onClick={() => store.setTableOpen(false)}
						className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground"
					>
						<IconX className="size-4" />
					</button>
				</div>
			</div>

			{view === "graph" ? (
				<TokenGraph />
			) : (
				<>
					<div className="min-h-0 flex-1 overflow-auto">
						<table className="w-max min-w-full border-separate border-spacing-0 text-control">
							<thead className="sticky top-0 z-10 bg-background">
								<tr className="h-8 text-caption text-muted-foreground">
									<th className="sticky left-0 z-10 w-64 border-b border-border bg-background px-3 text-left font-medium">
										Token
									</th>
									{values.map((value, index) => (
										<th
											key={value}
											className={cn(
												"group/head w-52 border-b border-l border-border px-2 text-left font-medium",
												!isBreakpoint &&
													store.mode[dimension] === value &&
													"text-foreground"
											)}
										>
											{renaming === `val:${value}` ? (
												<NameInput
													initial={value}
													label={`Rename ${value}`}
													taken={values}
													onCancel={() => setRenaming(null)}
													onSave={(to) => {
														edit.modes.renameValue(dimension, value, to);
														setRenaming(null);
													}}
												/>
											) : (
												<span className="flex items-center gap-1.5">
													<button
														type="button"
														title={
															isBreakpoint
																? undefined
																: "Show on canvas · double-click to rename"
														}
														onClick={() =>
															!isBreakpoint && store.setMode(dimension, value)
														}
														onDoubleClick={() =>
															!isBreakpoint && setRenaming(`val:${value}`)
														}
														className="flex items-center gap-1.5 capitalize hover:text-foreground"
													>
														{!isBreakpoint && (
															<span
																aria-hidden="true"
																className={cn(
																	"size-1.5 rounded-full",
																	store.mode[dimension] === value
																		? "bg-accent"
																		: "bg-border-strong"
																)}
															/>
														)}
														{value}
													</button>
													{index === 0 && (
														<span className="font-normal normal-case">
															default
														</span>
													)}
													{!isBreakpoint && index > 0 && (
														<span className="ml-auto">
															<ConfirmButton
																label={`Delete ${value} and its values`}
																onConfirm={() =>
																	edit.modes.removeValue(dimension, value)
																}
															/>
														</span>
													)}
												</span>
											)}
										</th>
									))}
									{!isBreakpoint && (
										<th className="w-40 border-b border-l border-border px-2 text-left font-medium">
											{adding === "value" ? (
												<NameInput
													label={`New ${dimension}`}
													placeholder={
														dimension === "theme" ? "high-contrast" : "name"
													}
													taken={values}
													onCancel={() => setAdding(null)}
													onSave={(name) => {
														edit.modes.addValue(dimension, name);
														setAdding(null);
													}}
												/>
											) : (
												<button
													type="button"
													onClick={() => setAdding("value")}
													className="flex h-6 items-center gap-1 rounded-md px-1.5 hover:bg-hover hover:text-foreground"
												>
													<IconPlus className="size-3.5" />
													Add {dimension}
												</button>
											)}
										</th>
									)}
								</tr>
							</thead>
							<tbody>
								{TYPE_ORDER.map((type) => {
									const group = rows.filter((token) => token.type === type);
									if (group.length === 0) return null;
									return [
										<tr key={type}>
											<th
												colSpan={values.length + 2}
												className="sticky left-0 h-7 border-b border-border bg-muted/50 px-3 text-left text-caption font-medium text-muted-foreground"
											>
												{TYPE_LABEL[type]}{" "}
												<span className="font-mono">{group.length}</span>
											</th>
										</tr>,
										...group.map((token) => {
											const issue = store.issues.find(
												(i) => i.token === token.path && i.severity === "error"
											);
											return (
												<tr
													key={token.path}
													onMouseEnter={() => store.setHover(token.path)}
													onMouseLeave={() => store.setHover(null)}
													className="hover:bg-hover/40"
												>
													<th
														scope="row"
														className="sticky left-0 z-[1] h-8 border-b border-border bg-background px-3 text-left font-normal"
													>
														<span className="flex items-center gap-2">
															<TokenGlyph
																type={token.type}
																value={
																	resolveToken(
																		token.path,
																		modeFor(values[0] ?? ""),
																		byPath,
																		store.breakpointOrder
																	).value
																}
															/>
															<span
																className={cn(
																	"min-w-0 flex-1 truncate font-mono text-value",
																	issue && "text-destructive"
																)}
																title={issue?.title}
															>
																{token.path}
															</span>
															<span className="text-caption text-muted-foreground">
																{TIER_LABEL[token.tier].slice(0, 4)}
															</span>
														</span>
													</th>
													{values.map((value, index) =>
														cell(token, value, index)
													)}
													{!isBreakpoint && (
														<td className="border-b border-l border-border" />
													)}
												</tr>
											);
										}),
									];
								})}
								{rows.length === 0 && (
									<tr>
										<td
											colSpan={values.length + 2}
											className="p-6 text-center text-muted-foreground"
										>
											{q ? `No tokens match “${query}”.` : "No tokens."}
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
					<p className="flex h-7 shrink-0 items-center gap-1 border-t border-border px-3 text-caption text-muted-foreground">
						Click a cell to edit. Empty cells use the default. Click a column to
						show it on the canvas.
					</p>
				</>
			)}
		</section>
	);
};
