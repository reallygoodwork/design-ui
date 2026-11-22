import type { TokenType } from "@design-ui/core";
import type { ReactNode } from "react";
import { useState } from "react";
import { useBreakpointCssGroup } from "../../hooks/useBreakpointCss";
import { useSelectedLayers } from "../../hooks/useSelectedLayers";
import { cn } from "../../lib/cn";
import { parseValue, UnitField } from "../common/UnitField";
import { DesignAction } from "../DesignAction";
import { TokenSlot } from "../tokens/TokenSlot";

export const ExpandToggle = ({
	expanded,
	label,
	icon,
	onToggle,
}: {
	expanded: boolean;
	label: string;
	icon: ReactNode;
	onToggle: () => void;
}) => (
	<button
		type="button"
		aria-label={label}
		aria-expanded={expanded}
		onClick={onToggle}
		className={cn(
			"mr-1 grid size-5 shrink-0 place-items-center rounded-sm text-muted-foreground transition-[scale] duration-100 hover:bg-foreground/10 hover:text-foreground focus-visible:outline-1 focus-visible:outline-ring active:scale-[0.96] [&_svg]:size-3.5",
			expanded && "bg-foreground/10 text-foreground"
		)}
	>
		{icon}
	</button>
);

export type LinkedField = {
	property: string;
	label: string;
	/** A letter or icon shown inside the field. */
	short: ReactNode;
};

type LinkedValuesControlProps = {
	label: string;
	fields: readonly LinkedField[];
	expandLabel: string;
	icon: ReactNode;
	units?: readonly string[];
	min?: number;
	scale?: Record<string, number>;
	/** Shown between the first two fields and the rest when expanded. */
	preview?: (values: (string | undefined)[]) => ReactNode;
	/** The kind of token these values can take. */
	tokenType?: TokenType;
};

const LinkedValues = ({
	label,
	fields,
	expandLabel,
	icon,
	units,
	min,
	scale = { px: 100 },
	preview,
	tokenType = "dimension",
}: LinkedValuesControlProps) => {
	const group = useBreakpointCssGroup(fields.map((f) => f.property));
	const values = group.entries.map((entry) => entry.value);
	const isUniform = values.every((value) => value === values[0]);
	const [expanded, setExpanded] = useState(!isUniform);

	const groupUnit =
		values.map((value) => parseValue(value)?.unit).find(Boolean) ?? "px";

	const changeUnit = (unit: string) => {
		const css: Record<string, string> = {};
		fields.forEach((field, index) => {
			const parsed = parseValue(values[index]);
			if (parsed && group.entries[index].isExplicit) {
				css[field.property] = `${parsed.value}${unit}`;
			}
		});
		group.write(css);
	};

	const toggle = (
		<ExpandToggle
			expanded={expanded}
			label={expandLabel}
			icon={icon}
			onToggle={() => setExpanded((open) => !open)}
		/>
	);

	const cells = fields.map((field, index) => {
		const { value, isExplicit } = group.entries[index];
		return (
			<div key={field.property} data-css-prop={field.property}>
				<TokenSlot
					variant="cell"
					title={field.label}
					prefix={field.short}
					inherited={!isExplicit}
					binding={{
						type: tokenType,
						cssProperty: field.property,
						value,
						onChange: (next) => group.setOne(field.property, next),
					}}
				>
					<UnitField
						value={isExplicit ? value : undefined}
						placeholderValue={isExplicit ? undefined : value}
						placeholder="0"
						units={units}
						defaultUnit={groupUnit}
						min={min}
						scale={scale}
						addon={
							group.isOverride && isExplicit ? (
								<>
									{field.short} {"\u2022"}
								</>
							) : (
								field.short
							)
						}
						ariaLabel={field.label}
						onChange={(next) => group.setOne(field.property, next)}
					/>
				</TokenSlot>
			</div>
		);
	});

	return (
		<div className="grid gap-1">
			<DesignAction
				label={group.isOverride ? `${label} \u2022` : label}
				property={fields[0].property}
				clear={{ hasValue: group.hasExplicit, onClear: group.clearAll }}
			>
				<TokenSlot
					title={label}
					inherited={!group.hasExplicit}
					// One token for every side; mixed values have none to show.
					binding={{
						type: tokenType,
						cssProperty: fields.map((field) => field.property).join(","),
						value: isUniform ? values[0] : undefined,
						onChange: group.setAll,
					}}
					trailing={toggle}
				>
					<UnitField
						value={isUniform && group.hasExplicit ? values[0] : undefined}
						placeholderValue={
							isUniform && !group.hasExplicit ? values[0] : undefined
						}
						placeholder={isUniform ? "0" : "Mixed"}
						units={units}
						defaultUnit={groupUnit}
						min={min}
						scale={scale}
						ariaLabel={label}
						onChange={group.setAll}
						onUnitChange={changeUnit}
						trailing={toggle}
					/>
				</TokenSlot>
			</DesignAction>
			{expanded && (
				<div className="grid grid-cols-2 gap-1">
					{cells.slice(0, 2)}
					{preview && <div className="col-span-2">{preview(values)}</div>}
					{cells.slice(2)}
				</div>
			)}
		</div>
	);
};

/**
 * One value for a set of related properties, which expands inline to edit each.
 * Opens expanded when the values differ.
 */
export const LinkedValuesControl = (props: LinkedValuesControlProps) => {
	const [layer] = useSelectedLayers();
	return <LinkedValues key={layer?.id} {...props} />;
};
