import { Popover } from "@base-ui/react/popover";
import { IconLink, IconLinkOff, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useBreakpointCssGroup } from "../../hooks/useBreakpointCss";
import { useDesignerSelector } from "../../hooks/useDesignerSelector";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { useTokens, useTokenValue } from "../../hooks/useTokens";
import { cn } from "../../lib/cn";
import { tokenCssValue, tokenFromCssValue } from "../../lib/tokens";
import { ClearButton } from "../common/ClearButton";
import { ScrubField } from "../common/ScrubField";
import { Select } from "../common/Select";
import {
	convertUnit,
	DEFAULT_UNITS,
	parseValue,
	type UnitFieldProps,
	useUnitValue,
} from "../common/UnitField";
import { suggestionFor } from "../tokens/suggest";
import { TokenIcon } from "../tokens/TokenIcon";
import { TokenList } from "../tokens/TokenList";
import { TokenPicker } from "../tokens/TokenPicker";

type Side = "top" | "right" | "bottom" | "left";
const SIDES: Side[] = ["top", "right", "bottom", "left"];

type Ring = "padding" | "margin";

const RINGS: Record<Ring, Record<Side, string>> = {
	padding: {
		top: "--padding-block-start",
		right: "--padding-inline-end",
		bottom: "--padding-block-end",
		left: "--padding-inline-start",
	},
	margin: {
		top: "--margin-block-start",
		right: "--margin-inline-end",
		bottom: "--margin-block-end",
		left: "--margin-inline-start",
	},
};

const PROPERTIES = [
	...SIDES.map((side) => RINGS.padding[side]),
	...SIDES.map((side) => RINGS.margin[side]),
];

const RING_NAMES: Record<Ring, string> = {
	padding: "Padding",
	margin: "Margin",
};

const MIXED = "mixed";

type ChipProps = UnitFieldProps & {
	ring: Ring;
	/** Typing `{` opens the token list for this side. */
	onRequestToken?: () => void;
	isExplicit: boolean;
	isOverride: boolean;
	hasValue: boolean;
	label: string;
};

/**
 * One side's value on the diagram, always with its unit. Solid when set at this
 * breakpoint, outlined when inherited, and quiet when there's nothing set.
 */
const Chip = ({
	ring,
	isExplicit,
	isOverride,
	hasValue,
	label,
	onRequestToken,
	...field
}: ChipProps) => {
	const unit = useUnitValue(field, true);
	const isPadding = ring === "padding";
	return (
		<ScrubField
			{...unit.scrub}
			scaleMax={undefined}
			hideHandle
			// Flex, so the input sits in its box instead of on a text baseline
			className="mx-auto flex h-5 w-fit items-center"
		>
			<input
				aria-label={label}
				aria-description={!isExplicit && hasValue ? "Inherited" : undefined}
				title={unit.text || unit.placeholderText}
				spellCheck={false}
				value={unit.text}
				placeholder={unit.placeholderText}
				onChange={unit.handleChange}
				onBlur={unit.commit}
				onKeyDown={(event) => {
					if (event.key === "{" && onRequestToken) {
						event.preventDefault();
						onRequestToken();
						return;
					}
					if (event.key === "Enter") unit.commit();
					if (event.key === "ArrowUp" || event.key === "ArrowDown") {
						event.preventDefault();
						unit.stepBy(event.key === "ArrowUp" ? 1 : -1);
					}
				}}
				className={cn(
					"[field-sizing:content] h-full w-auto min-w-8 max-w-16 truncate rounded border border-transparent bg-transparent px-1 text-center font-mono text-value outline-none transition-colors duration-100 placeholder:text-current placeholder:opacity-100 hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring",
					isExplicit &&
						isPadding &&
						"bg-accent-strong text-white hover:brightness-90",
					isExplicit &&
						!isPadding &&
						"bg-foreground/75 text-background hover:bg-foreground/90",
					!isExplicit &&
						hasValue &&
						isPadding &&
						"border-accent-soft border-dashed text-accent-text",
					!isExplicit &&
						hasValue &&
						!isPadding &&
						"border-foreground/40 border-dashed text-muted-foreground",
					!hasValue && "text-muted-foreground"
				)}
			/>
			{isOverride && (
				<span
					aria-hidden="true"
					className="pointer-events-none absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-accent ring-1 ring-background"
				/>
			)}
		</ScrubField>
	);
};

/** The token list for one side, or a whole ring, opened beside the diagram. */
const SideTokens = ({
	title,
	properties,
	value,
	onChange,
	open,
	onOpenChange,
	children,
}: {
	title: string;
	properties: string[];
	value: string | undefined;
	onChange: (value: string) => void;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: React.ReactNode;
}) => {
	const binding = {
		type: "dimension" as const,
		cssProperty: properties.join(","),
		value,
		onChange,
	};
	return (
		<Popover.Root open={open} onOpenChange={onOpenChange}>
			{children}
			<Popover.Portal>
				<Popover.Positioner
					anchor={() => document.querySelector("[data-box-model]")}
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
};

/**
 * A side whose value comes from a token. The diagram stays a picture of
 * values, so it shows the number, marked as a token; the name is on hover
 * and in the token list below. Click to change it.
 */
const TokenChip = ({
	ring,
	value,
	path,
	isExplicit,
	label,
}: {
	ring: Ring;
	value: string | undefined;
	path: string;
	isExplicit: boolean;
	label: string;
}) => {
	const breakpointId = useDesignerSelector((state) => state.activeBreakpointId);
	const { resolved } = useTokenValue(value, "dimension", breakpointId);
	return (
		<Popover.Trigger
			aria-label={`${label}: ${path}, ${resolved ?? "unresolved"}`}
			title={`${path} · ${resolved ?? "unresolved"}`}
			className={cn(
				"mx-auto flex h-5 max-w-16 items-center gap-0.5 rounded px-1 font-mono text-value outline-none focus-visible:ring-2 focus-visible:ring-ring",
				ring === "padding"
					? "bg-accent-strong text-white"
					: "bg-foreground/75 text-background",
				!isExplicit && "border border-dashed bg-transparent text-accent-text"
			)}
		>
			<TokenIcon aria-hidden="true" className="size-2.5 shrink-0 opacity-80" />
			<span className="truncate">{resolved ?? "?"}</span>
		</Popover.Trigger>
	);
};

const LinkToggle = ({
	linked,
	label,
	onToggle,
}: {
	linked: boolean;
	label: string;
	onToggle: () => void;
}) => (
	<button
		type="button"
		aria-label={label}
		aria-pressed={linked}
		title={label}
		onClick={onToggle}
		className={cn(
			"grid size-4 shrink-0 place-items-center rounded-sm text-muted-foreground transition-[scale] duration-100 hover:bg-foreground/10 hover:text-foreground focus-visible:outline-1 focus-visible:outline-ring active:scale-[0.96] [&_svg]:size-3",
			linked && "text-accent-text"
		)}
	>
		{linked ? <IconLink /> : <IconLinkOff />}
	</button>
);

// Equal side columns keep the inner box centered whatever the chips say,
// and the gaps keep every chip clear of the box it sits around
const RING_ROWS =
	"grid grid-rows-[20px_20px_minmax(0,1fr)_20px] items-center gap-x-1.5 gap-y-1.5";
const MARGIN_GRID = `${RING_ROWS} gap-x-1 grid-cols-[minmax(min-content,1fr)_minmax(auto,4fr)_minmax(min-content,1fr)]`;
const PADDING_GRID = `${RING_ROWS} grid-cols-[minmax(min-content,1fr)_minmax(0.75rem,2.5rem)_minmax(min-content,1fr)]`;

const BoxDiagram = () => {
	const group = useBreakpointCssGroup(PROPERTIES);
	const entryFor = (property: string) =>
		group.entries[PROPERTIES.indexOf(property)];

	const ringValues = (ring: Ring) =>
		SIDES.map((side) => entryFor(RINGS[ring][side]).value);
	const isUniform = (ring: Ring) =>
		ringValues(ring).every((value) => value === ringValues(ring)[0]);

	const [linked, setLinked] = useState<Record<Ring, boolean>>({
		padding: isUniform("padding"),
		margin: isUniform("margin"),
	});
	const [emptyUnit, setEmptyUnit] = useState<Record<Ring, string>>({
		padding: "px",
		margin: "px",
	});

	/** The ring's one unit, or null when its sides use different ones. */
	const ringUnit = (ring: Ring) => {
		const units = new Set(
			ringValues(ring)
				.map((value) => parseValue(value)?.unit)
				.filter((unit) => unit !== undefined)
		);
		if (units.size > 1) return null;
		return [...units][0] ?? emptyUnit[ring];
	};

	const changeRingUnit = (ring: Ring, next: string) => {
		setEmptyUnit((current) => ({ ...current, [ring]: next }));
		const css: Record<string, string> = {};
		for (const side of SIDES) {
			const property = RINGS[ring][side];
			const parsed = parseValue(entryFor(property).value);
			if (parsed && parsed.value !== 0) {
				css[property] =
					`${convertUnit(parsed.value, parsed.unit, next)}${next}`;
			}
		}
		if (Object.keys(css).length > 0) group.write(css);
	};

	// Which side, or whole ring, has its token list open.
	const [picking, setPicking] = useState<string | null>(null);
	const { tokens } = useTokens();
	const hasTokens = tokens.some((token) => token.type === "dimension");

	const writeSide = (ring: Ring, side: Side, next: string) => {
		const map = RINGS[ring];
		if (linked[ring]) {
			group.write(Object.fromEntries(SIDES.map((s) => [map[s], next])));
		} else {
			group.setOne(map[side], next);
		}
	};

	const chip = (ring: Ring, side: Side) => {
		const property = RINGS[ring][side];
		const { value, isExplicit } = entryFor(property);
		const name = `${RING_NAMES[ring]} ${side}`;
		const key = `${ring}:${side}`;
		const token = tokenFromCssValue(value, tokens)?.path;
		return (
			<div data-css-prop={property}>
				<SideTokens
					title={name}
					properties={
						linked[ring] ? SIDES.map((s) => RINGS[ring][s]) : [property]
					}
					value={value}
					onChange={(next) => writeSide(ring, side, next)}
					open={picking === key}
					onOpenChange={(open) => setPicking(open ? key : null)}
				>
					{token && hasTokens ? (
						<TokenChip
							ring={ring}
							value={value}
							path={token}
							isExplicit={isExplicit}
							label={name}
						/>
					) : (
						<Chip
							onRequestToken={hasTokens ? () => setPicking(key) : undefined}
							ring={ring}
							label={name}
							isExplicit={isExplicit}
							isOverride={group.isOverride && isExplicit}
							hasValue={Boolean(value)}
							value={isExplicit ? value : undefined}
							placeholderValue={isExplicit ? undefined : value}
							placeholder="0"
							defaultUnit={ringUnit(ring) ?? "px"}
							min={ring === "padding" ? 0 : undefined}
							ariaLabel={name}
							onChange={(next) => writeSide(ring, side, next)}
						/>
					)}
				</SideTokens>
			</div>
		);
	};

	const header = (ring: Ring, extra?: React.ReactNode) => {
		const unit = ringUnit(ring);
		const items = DEFAULT_UNITS.map((u) => ({ label: u, value: u }));
		return (
			<div className="col-span-3 flex h-5 items-center gap-0.5 pl-1">
				<span className="font-medium text-caption text-muted-foreground">
					{RING_NAMES[ring]}
				</span>
				<Select
					variant="suffix"
					ariaLabel={`${RING_NAMES[ring]} unit`}
					items={
						unit === null ? [{ label: "Mixed", value: MIXED }, ...items] : items
					}
					value={unit ?? MIXED}
					onValueChange={(next) => {
						if (next !== MIXED) changeRingUnit(ring, next);
					}}
				/>
				<span className="flex-1" />
				{extra}
				<LinkToggle
					linked={linked[ring]}
					label={`Edit all ${ring} sides together`}
					onToggle={() =>
						setLinked((current) => ({ ...current, [ring]: !current[ring] }))
					}
				/>
			</div>
		);
	};

	return (
		<div data-slot="action" data-box-model="" className="group/action relative">
			<div className={cn(MARGIN_GRID, "rounded-md bg-input px-1 py-1.5")}>
				{header(
					"margin",
					<ClearButton
						label="Reset padding and margin"
						hasValue={group.hasExplicit}
						handleClear={group.clearAll}
					/>
				)}
				<span />
				{chip("margin", "top")}
				<span />
				{chip("margin", "left")}
				<div
					className={cn(
						PADDING_GRID,
						"rounded-md border border-border bg-background p-1.5"
					)}
				>
					{header("padding")}
					<span />
					{chip("padding", "top")}
					<span />
					{chip("padding", "left")}
					<div
						aria-hidden="true"
						className="h-8 rounded-sm border border-accent-soft border-dashed bg-accent/10"
					/>
					{chip("padding", "right")}
					<span />
					{chip("padding", "bottom")}
					<span />
				</div>
				{chip("margin", "right")}
				<span />
				{chip("margin", "bottom")}
				<span />
			</div>
			{hasTokens && <BoxTokens group={group} />}
		</div>
	);
};

type Group = ReturnType<typeof useBreakpointCssGroup>;

const SIDE_SETS: { id: string; label: string; sides: Side[] }[] = [
	{ id: "all", label: "All", sides: SIDES },
	{ id: "x", label: "Left & right", sides: ["left", "right"] },
	{ id: "y", label: "Top & bottom", sides: ["top", "bottom"] },
	{ id: "top", label: "Top", sides: ["top"] },
	{ id: "right", label: "Right", sides: ["right"] },
	{ id: "bottom", label: "Bottom", sides: ["bottom"] },
	{ id: "left", label: "Left", sides: ["left"] },
];

/** "all sides", "left & right", "top, left". */
const describeSides = (sides: Side[]) => {
	const set = new Set(sides);
	if (set.size === 4) return "all sides";
	if (set.size === 2 && set.has("left") && set.has("right"))
		return "left & right";
	if (set.size === 2 && set.has("top") && set.has("bottom"))
		return "top & bottom";
	return SIDES.filter((s) => set.has(s)).join(", ");
};

/** One token in use: its value, where it applies, and a way to stop using it. */
const BoxTokenRow = ({
	path,
	ring,
	sides,
	value,
	onDetach,
}: {
	path: string;
	ring: Ring;
	sides: Side[];
	value: string;
	onDetach: (resolved: string) => void;
}) => {
	const breakpointId = useDesignerSelector((state) => state.activeBreakpointId);
	const { resolved } = useTokenValue(value, "dimension", breakpointId);
	const { setHover } = useTokens();
	return (
		<li
			className="group/token flex items-center gap-1.5 rounded-md px-1.5 py-1 text-control hover:bg-hover"
			onMouseEnter={() => setHover(path)}
			onMouseLeave={() => setHover(null)}
		>
			<TokenIcon
				aria-hidden="true"
				className="size-3.5 shrink-0 text-accent-text"
			/>
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate">{path}</span>
				<span className="truncate text-caption text-muted-foreground">
					{RING_NAMES[ring]} {describeSides(sides)}
				</span>
			</span>
			<span className="shrink-0 font-mono text-value text-muted-foreground">
				{resolved}
			</span>
			<button
				type="button"
				aria-label={`Stop using ${path} for ${ring} ${describeSides(sides)}`}
				title="Keep the value, stop using the token"
				onClick={() => resolved && onDetach(resolved)}
				className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground opacity-0 hover:bg-background hover:text-foreground group-hover/token:opacity-100 focus-visible:opacity-100"
			>
				<IconX className="size-3" />
			</button>
		</li>
	);
};

/**
 * The tokens behind padding and margin, spelled out: which token, which
 * sides, what value. "Use a token…" asks where first (padding or margin,
 * which sides), then which token, so it's clear what will change.
 */
const BoxTokens = ({ group }: { group: Group }) => {
	const store = useTokens();
	const [layer] = useSelectedLayers();
	const [open, setOpen] = useState(false);
	const [ring, setRing] = useState<Ring>("padding");
	const [sideSet, setSideSet] = useState("all");
	const sides = SIDE_SETS.find((s) => s.id === sideSet)?.sides ?? SIDES;
	const properties = sides.map((side) => RINGS[ring][side]);

	// Group sides by ring and token.
	const used = new Map<
		string,
		{ path: string; ring: Ring; sides: Side[]; value: string }
	>();
	for (const r of ["padding", "margin"] as const) {
		for (const side of SIDES) {
			const value = group.entries[PROPERTIES.indexOf(RINGS[r][side])].value;
			const token = tokenFromCssValue(value, store.tokens);
			if (!token || !value) continue;
			const key = `${r}:${token.path}`;
			const entry = used.get(key) ?? {
				path: token.path,
				ring: r,
				sides: [],
				value,
			};
			entry.sides.push(side);
			used.set(key, entry);
		}
	}

	return (
		<div className="mt-1.5 flex flex-col gap-0.5">
			{used.size > 0 && (
				<ul aria-label="Tokens on padding and margin">
					{[...used.values()].map((u) => (
						<BoxTokenRow
							key={`${u.ring}:${u.path}`}
							{...u}
							onDetach={(resolved) =>
								group.write(
									Object.fromEntries(
										u.sides.map((side) => [RINGS[u.ring][side], resolved])
									)
								)
							}
						/>
					))}
				</ul>
			)}
			<Popover.Root
				open={open}
				onOpenChange={(next) => {
					setOpen(next);
					if (!next) store.setPreview(null);
				}}
			>
				<Popover.Trigger className="flex h-7 items-center gap-1.5 self-start rounded-md px-1.5 text-control text-muted-foreground hover:bg-hover hover:text-foreground">
					<TokenIcon aria-hidden="true" className="size-3.5" />
					Use a token…
				</Popover.Trigger>
				<Popover.Portal>
					<Popover.Positioner
						anchor={() => document.querySelector("[data-box-model]")}
						sideOffset={24}
						side="left"
						align="start"
						collisionPadding={8}
					>
						<Popover.Popup className="ds-popup ds-surface z-50 flex w-72 flex-col gap-2.5 p-4 outline-hidden">
							<Popover.Title className="font-semibold text-control leading-none">
								Use a token
							</Popover.Title>
							{/* biome-ignore lint/a11y/useSemanticElements: a labelled group of toggle buttons */}
							<div
								role="group"
								aria-label="Where"
								className="grid grid-cols-2 rounded-md bg-muted p-[3px]"
							>
								{(["padding", "margin"] as const).map((r) => (
									<button
										key={r}
										type="button"
										aria-pressed={ring === r}
										onClick={() => setRing(r)}
										className={cn(
											"h-6 rounded-sm text-control text-muted-foreground hover:text-foreground",
											ring === r && "bg-raised text-foreground shadow-xs"
										)}
									>
										{RING_NAMES[r]}
									</button>
								))}
							</div>
							{/* biome-ignore lint/a11y/useSemanticElements: a labelled group of toggle buttons */}
							<div
								role="group"
								aria-label="Sides"
								className="flex flex-wrap gap-1"
							>
								{SIDE_SETS.map((s) => (
									<button
										key={s.id}
										type="button"
										aria-pressed={sideSet === s.id}
										onClick={() => setSideSet(s.id)}
										className={cn(
											"h-6 rounded-md bg-input px-2 text-caption text-muted-foreground hover:text-foreground",
											sideSet === s.id && "bg-selected text-foreground"
										)}
									>
										{s.label}
									</button>
								))}
							</div>
							<TokenList
								suggest={suggestionFor(properties[0])}
								className="max-h-60"
								type="dimension"
								onHover={(path) =>
									store.setPreview(
										path && layer
											? {
													layerId: layer.id,
													cssProperty: properties.join(","),
													path,
												}
											: null
									)
								}
								onPick={(path) => {
									group.write(
										Object.fromEntries(
											properties.map((p) => [p, tokenCssValue(path)])
										)
									);
									store.setPreview(null);
									setOpen(false);
								}}
							/>
						</Popover.Popup>
					</Popover.Positioner>
				</Popover.Portal>
			</Popover.Root>
		</div>
	);
};

/** Padding and margin on a picture of the layer, edited in place. */
export const BoxModel = () => {
	const [layer] = useSelectedLayers();
	return <BoxDiagram key={layer?.id} />;
};
