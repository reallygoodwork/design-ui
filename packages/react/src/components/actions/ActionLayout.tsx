import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { useState } from "react";
import { useBreakpointCssGroup } from "../../hooks/useBreakpointCss";
import { useLayerTypes } from "../../hooks/useLayerTypes";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { cn } from "../../lib/cn";
import { UnitField } from "../common/UnitField";
import { DesignAction } from "../DesignAction";
import { TokenSlot } from "../tokens/TokenSlot";
import { ActionAlignItems } from "./ActionAlignItems";
import { ActionDisplay } from "./ActionDisplay";
import { ActionFlexDirection } from "./ActionFlexDirection";
import { ActionFlexWrap } from "./ActionFlexWrap";
import { ActionGridLayout } from "./ActionGridLayout";
import { ActionJustifyContent } from "./ActionJustifyContent";
import { ActionSize, ActionSizeLimits, SIZE_LIMITS } from "./ActionSize";
import { BoxModel } from "./BoxModel";

const DISPLAY = "--display";
const DIRECTION = "--flex-direction";
const JUSTIFY = "--justify-content";
const ALIGN = "--align-items";
const COLUMN_GAP = "--column-gap";
const ROW_GAP = "--row-gap";
const WRAP = "--flex-wrap";
const PROPERTIES = [
	DISPLAY,
	DIRECTION,
	JUSTIFY,
	ALIGN,
	COLUMN_GAP,
	ROW_GAP,
	WRAP,
];

type Mode = "default" | "row" | "column" | "grid";

const MODES: { label: string; value: Mode }[] = [
	{ label: "Default", value: "default" },
	{ label: "Row", value: "row" },
	{ label: "Column", value: "column" },
	{ label: "Grid", value: "grid" },
];

const POSITIONS = ["flex-start", "center", "flex-end"] as const;
const SPACE_BETWEEN = "space-between";

const readMode = (display?: string, direction?: string): Mode => {
	if (display === "flex" || display === "inline-flex") {
		return direction?.startsWith("column") ? "column" : "row";
	}
	return display === "grid" || display === "inline-grid" ? "grid" : "default";
};

type Group = ReturnType<typeof useBreakpointCssGroup>;

const useLayoutValues = (group: Group) => {
	const entry = (property: string) =>
		group.entries[PROPERTIES.indexOf(property)];
	return {
		entry,
		mode: readMode(entry(DISPLAY).value, entry(DIRECTION).value),
	};
};

const ModeTabs = ({ group }: { group: Group }) => {
	const { entry, mode } = useLayoutValues(group);
	const isInherited = !entry(DISPLAY).isExplicit && mode !== "default";

	const setMode = (next: Mode) => {
		const display = {
			// Larger breakpoints have to say "block" to undo an inherited layout
			default: group.isPrimary ? "" : "block",
			row: "flex",
			column: "flex",
			grid: "grid",
		}[next];
		group.write({
			[DISPLAY]: display,
			[DIRECTION]: next === "row" || next === "column" ? next : "",
		});
	};

	return (
		<div data-css-prop={DISPLAY}>
			<ToggleGroup
				aria-label="Arrange children"
				value={[mode]}
				onValueChange={(next) => {
					if (next[0]) setMode(next[0] as Mode);
				}}
				className="grid h-7 grid-cols-4 gap-0.5 rounded-md bg-input p-1"
			>
				{MODES.map((option) => (
					<Toggle
						key={option.value}
						value={option.value}
						className={cn(
							"flex h-full items-center justify-center rounded-sm text-caption hover:bg-raised/50 data-pressed:bg-raised data-pressed:shadow-xs data-pressed:font-medium",
							isInherited &&
								"data-pressed:text-muted-foreground data-pressed:outline-1 data-pressed:outline-dashed data-pressed:outline-foreground/40 data-pressed:-outline-offset-1"
						)}
					>
						{option.label}
						{isInherited && option.value === mode && (
							<span className="sr-only"> (inherited)</span>
						)}
					</Toggle>
				))}
			</ToggleGroup>
		</div>
	);
};

/** Nine spots for where children sit, in the layer's own direction. */
const AlignmentPad = ({ group }: { group: Group }) => {
	const { entry, mode } = useLayoutValues(group);
	const xProperty = mode === "column" ? ALIGN : JUSTIFY;
	const yProperty = mode === "column" ? JUSTIFY : ALIGN;
	const position = (property: string) =>
		Math.max(
			0,
			POSITIONS.indexOf(entry(property).value as (typeof POSITIONS)[number])
		);
	const column = position(xProperty);
	const row = position(yProperty);
	const isSet = entry(xProperty).isExplicit || entry(yProperty).isExplicit;
	const hasValue = Boolean(entry(xProperty).value || entry(yProperty).value);
	const isSpread = entry(JUSTIFY).value === SPACE_BETWEEN;

	const place = (nextColumn: number, nextRow: number) => {
		const clearing = isSet && nextColumn === column && nextRow === row;
		group.write({
			[xProperty]: clearing ? "" : POSITIONS[nextColumn],
			[yProperty]: clearing ? "" : POSITIONS[nextRow],
		});
	};

	const handleKey = (event: React.KeyboardEvent) => {
		const moves: Record<string, [number, number]> = {
			ArrowLeft: [-1, 0],
			ArrowRight: [1, 0],
			ArrowUp: [0, -1],
			ArrowDown: [0, 1],
		};
		const move = moves[event.key];
		if (!move) return;
		event.preventDefault();
		place(
			Math.min(2, Math.max(0, column + move[0])),
			Math.min(2, Math.max(0, row + move[1]))
		);
	};

	const isActive = (cellColumn: number, cellRow: number) => {
		if (isSpread) {
			return mode === "column" ? cellColumn === column : cellRow === row;
		}
		return cellColumn === column && cellRow === row;
	};

	return (
		<div
			role="radiogroup"
			aria-label="Align children"
			data-css-prop={JUSTIFY}
			onKeyDown={handleKey}
			className="grid min-h-[60px] grid-cols-3 grid-rows-3 rounded-md bg-input p-1"
		>
			{[0, 1, 2].flatMap((cellRow) =>
				[0, 1, 2].map((cellColumn) => {
					const active = isActive(cellColumn, cellRow);
					return (
						// biome-ignore lint/a11y/useSemanticElements: styled as a spot on the pad, not a radio dot
						<button
							key={`${cellRow}-${cellColumn}`}
							type="button"
							role="radio"
							aria-checked={active}
							aria-label={`${["Top", "Middle", "Bottom"][cellRow]} ${["left", "center", "right"][cellColumn]}`}
							tabIndex={cellColumn === column && cellRow === row ? 0 : -1}
							onClick={() => place(cellColumn, cellRow)}
							className="group/spot grid place-items-center rounded-sm outline-none hover:bg-raised/50 focus-visible:ring-2 focus-visible:ring-ring"
						>
							<span
								className={cn(
									"block rounded-full transition-[width,height,background-color] duration-100",
									active
										? "h-2 w-3.5 rounded-xs"
										: "size-1 bg-foreground/30 group-hover/spot:size-1.5",
									active && isSet && "bg-accent",
									// Inherited: an outline, not a fill, so it reads without color
									active &&
										!isSet &&
										(hasValue
											? "border border-accent border-dashed"
											: "bg-foreground/30")
								)}
							/>
						</button>
					);
				})
			)}
		</div>
	);
};

const GAP_AUTO = [{ label: "Auto", value: "auto" }];

const GapField = ({
	group,
	property,
	label,
	spreads,
}: {
	group: Group;
	property: string;
	label: string;
	/** On the main axis, Auto spreads the children out. */
	spreads: boolean;
}) => {
	const { entry } = useLayoutValues(group);
	const { value, isExplicit } = entry(property);
	const justify = entry(JUSTIFY);
	const isAuto = spreads && justify.value === SPACE_BETWEEN;

	const change = (next: string) => {
		if (next === "auto") {
			group.write({ [property]: "", [JUSTIFY]: SPACE_BETWEEN });
			return;
		}
		group.write({
			[property]: next,
			...(isAuto ? { [JUSTIFY]: "" } : {}),
		});
	};

	return (
		<DesignAction label={label} property={property}>
			<TokenSlot
				title={label}
				inherited={!isExplicit}
				binding={{
					type: "dimension",
					cssProperty: property,
					value: isAuto ? undefined : value,
					onChange: change,
				}}
			>
				<UnitField
					keywords={spreads ? GAP_AUTO : undefined}
					value={
						isAuto
							? justify.isExplicit
								? "auto"
								: undefined
							: isExplicit
								? value
								: undefined
					}
					placeholderValue={
						isAuto && !justify.isExplicit
							? "auto"
							: isExplicit
								? undefined
								: value
					}
					placeholder="0"
					min={0}
					scale={{ px: 100 }}
					ariaLabel={label}
					onChange={change}
				/>
			</TokenSlot>
		</DesignAction>
	);
};

const ChildLayout = ({ group }: { group: Group }) => {
	const { entry, mode } = useLayoutValues(group);
	if (mode === "default") return null;

	const wraps = entry(WRAP).value === "wrap";

	return (
		<>
			<div className="grid grid-cols-2 gap-1">
				<AlignmentPad group={group} />
				<div className="grid content-start gap-1">
					{mode === "row" && (
						<>
							<GapField
								group={group}
								property={COLUMN_GAP}
								label="Gap"
								spreads
							/>
							<ActionFlexWrap />
							{wraps && (
								<GapField
									group={group}
									property={ROW_GAP}
									label="Lines"
									spreads={false}
								/>
							)}
						</>
					)}
					{mode === "column" && (
						<>
							<GapField group={group} property={ROW_GAP} label="Gap" spreads />
							<ActionFlexWrap />
						</>
					)}
					{mode === "grid" && (
						<>
							<GapField
								group={group}
								property={COLUMN_GAP}
								label="Across"
								spreads={false}
							/>
							<GapField
								group={group}
								property={ROW_GAP}
								label="Down"
								spreads={false}
							/>
						</>
					)}
				</div>
			</div>
			{mode === "grid" && <ActionGridLayout />}
		</>
	);
};

/**
 * How a layer sits and arranges its contents: size, direction, alignment, gaps,
 * padding and margin, written for people who don't think in CSS.
 */
const MoreOptions = ({ showChildControls }: { showChildControls: boolean }) => {
	const limits = useBreakpointCssGroup(SIZE_LIMITS);
	const [open, setOpen] = useState(limits.entries.some((entry) => entry.value));
	return (
		<>
			<button
				type="button"
				aria-expanded={open}
				onClick={() => setOpen((current) => !current)}
				className="flex h-6 items-center gap-1 justify-self-start rounded-sm pl-2 text-caption text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3"
			>
				<IconAdjustmentsHorizontal />
				{open ? "Fewer options" : "More options"}
			</button>
			{open && (
				<div className="grid grid-cols-1 gap-1">
					<ActionSizeLimits />
					{showChildControls && (
						<>
							<ActionDisplay />
							<ActionJustifyContent />
							<ActionAlignItems />
							<ActionFlexDirection />
						</>
					)}
				</div>
			)}
		</>
	);
};

export const ActionLayout = () => {
	const [layer] = useSelectedLayers();
	const layerTypes = useLayerTypes();
	const group = useBreakpointCssGroup(PROPERTIES);
	const canHaveChildren = layerTypes.find(
		(type) => type.type === layer?.type
	)?.supportsChildren;

	const hasChildLayout =
		readMode(group.entries[0].value, group.entries[1].value) !== "default";

	return (
		<div className="grid grid-cols-1 gap-1">
			<ActionSize />
			{canHaveChildren && (
				<>
					<ModeTabs group={group} />
					<ChildLayout group={group} />
				</>
			)}
			<BoxModel />
			<MoreOptions
				key={layer?.id}
				showChildControls={Boolean(canHaveChildren) && hasChildLayout}
			/>
		</div>
	);
};
