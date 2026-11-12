import { useBreakpointCssGroup } from "../../hooks/useBreakpointCss";
import { useLayerDimensions } from "../../hooks/useLayerDimensions";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { UnitField } from "../common/UnitField";
import { TokenSlot } from "../tokens/TokenSlot";

const SIZE_SCALE = { px: 1440 };

const SIZE_MODES = [
	{ label: "Fill", value: "100%" },
	{ label: "Hug", value: "fit-content" },
	{ label: "Auto", value: "" },
];

type Group = ReturnType<typeof useBreakpointCssGroup>;

const SizeField = ({
	group,
	properties,
	index,
	short,
	ariaLabel,
	computed,
	keywords,
}: {
	group: Group;
	properties: string[];
	index: number;
	short: string;
	ariaLabel: string;
	computed?: number;
	keywords?: typeof SIZE_MODES;
}) => {
	const { value, isExplicit } = group.entries[index];
	return (
		<div className="min-w-0" data-css-prop={properties[index]}>
			<TokenSlot
				variant="cell"
				title={ariaLabel}
				prefix={short.length <= 2 ? short : undefined}
				inherited={!isExplicit}
				binding={{
					type: "dimension",
					cssProperty: properties[index],
					value,
					onChange: (next) => group.setOne(properties[index], next),
				}}
			>
				<UnitField
					keywords={keywords}
					value={isExplicit ? value : undefined}
					placeholderValue={isExplicit ? undefined : value}
					placeholder={computed ? `${computed}` : undefined}
					defaultValue={computed ?? 0}
					min={0}
					scale={SIZE_SCALE}
					addon={group.isOverride && isExplicit ? `${short} •` : short}
					ariaLabel={ariaLabel}
					onChange={(next) => group.setOne(properties[index], next)}
				/>
			</TokenSlot>
		</div>
	);
};

const SIZE = ["--width", "--height"];

/** Width and height. Each is a number, or Fill, Hug or Auto. */
export const ActionSize = () => {
	const [layer] = useSelectedLayers();
	const dimensions = useLayerDimensions(layer);
	const group = useBreakpointCssGroup(SIZE);
	return (
		<div className="grid grid-cols-2 gap-1">
			<SizeField
				group={group}
				properties={SIZE}
				index={0}
				short="W"
				ariaLabel="Width"
				computed={dimensions?.width}
				keywords={SIZE_MODES}
			/>
			<SizeField
				group={group}
				properties={SIZE}
				index={1}
				short="H"
				ariaLabel="Height"
				computed={dimensions?.height}
				keywords={SIZE_MODES}
			/>
		</div>
	);
};

export const SIZE_LIMITS = [
	"--min-width",
	"--min-height",
	"--max-width",
	"--max-height",
];

const LIMIT_LABELS = ["Min width", "Min height", "Max width", "Max height"];

/** Bounds for a layer that grows and shrinks. */
export const ActionSizeLimits = () => {
	const group = useBreakpointCssGroup(SIZE_LIMITS);
	return (
		<div className="grid gap-1">
			{LIMIT_LABELS.map((label, index) => (
				<SizeField
					key={label}
					group={group}
					properties={SIZE_LIMITS}
					index={index}
					short={label}
					ariaLabel={label}
				/>
			))}
		</div>
	);
};
