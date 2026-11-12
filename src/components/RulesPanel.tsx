import {
	ownRule,
	PROPERTY_GROUPS,
	type Rule,
	rulesFor,
	updateLayerRule,
} from "@design-ui/core";
import { type ReactNode, useId } from "react";
import { useCanSetRules } from "../hooks/useAllowed";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useDesignerSelector } from "../hooks/useDesignerSelector";
import { useLayerTypes } from "../hooks/useLayerTypes";
import { useSelectedLayers } from "../hooks/useSelectedLayers";
import { DesignerPane } from "./DesignerPane";

const GROUP_LABELS: Record<string, string> = {
	color: "Color",
	typography: "Typography",
	spacing: "Spacing",
	size: "Size",
};
const GROUPS = Object.keys(PROPERTY_GROUPS).filter((g) => GROUP_LABELS[g]);

/** What "content" means for each kind of layer, for the checkbox label. */
const CONTENT_LABEL: Record<string, string> = {
	text: "Editors can change its text",
	image: "Editors can change the image",
	input: "Editors can change its placeholder",
};

const Check = ({
	label,
	hint,
	checked,
	onChange,
}: {
	label: string;
	hint?: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) => {
	const hintId = useId();
	return (
		<label className="flex min-h-7 cursor-default items-start gap-2 rounded-md px-1 py-1 text-control hover:bg-hover/50">
			<input
				type="checkbox"
				className="mt-0.5 accent-primary"
				checked={checked}
				aria-describedby={hint ? hintId : undefined}
				onChange={(event) => onChange(event.target.checked)}
			/>
			<span className="min-w-0">
				{label}
				{hint && (
					<span
						id={hintId}
						className="block text-caption text-muted-foreground"
					>
						{hint}
					</span>
				)}
			</span>
		</label>
	);
};

const Subhead = ({ children }: { children: ReactNode }) => (
	<p className="px-1 pt-1 text-caption text-muted-foreground">{children}</p>
);

/** Who a rule covers, in words. */
const scope = (rule: Rule, names: Record<string, string>) => {
	const { layerIds, layerTypes } = rule.target;
	const parts = [
		...(layerIds ?? []).map((id) => names[id] ?? id),
		...(layerTypes ?? []).map((t) => `every ${t}`),
	];
	const who = parts.length ? parts.join(", ") : "every layer";
	return rule.target.includeChildren ? `${who} and what's inside` : who;
};

/**
 * For builders: what editors and agents may change on the selected layer.
 * Each change is an ordinary edit, so it can be undone and shows in Activity.
 * Rules that cover more than this layer are listed, to be changed in the file.
 */
export const RulesPanel = () => {
	const [layer] = useSelectedLayers();
	const canSetRules = useCanSetRules();
	const dispatch = useDesignerAction();
	const rules = useDesignerSelector((s) => s.rules);
	const nodes = useDesignerSelector((s) => s.nodes);
	const breakpoints = useDesignerSelector((s) => s.breakpoints);
	const layerTypes = useLayerTypes();

	if (!canSetRules)
		return (
			<DesignerPane>
				<p className="text-center text-control text-muted-foreground">
					Only builders can set rules.
				</p>
			</DesignerPane>
		);
	if (!layer)
		return (
			<DesignerPane>
				<p className="text-center text-control text-muted-foreground">
					Select a layer to set what editors can change on it.
				</p>
			</DesignerPane>
		);

	const own = ownRule(rules, layer.id);
	const others = rulesFor({ nodes, breakpoints, rules }, layer.id).filter(
		(r) => r !== own
	);
	const type = layerTypes.find((t) => t.type === layer.type);
	const isContainer = Boolean(type?.supportsChildren);
	const change = (edit: (rule: Rule) => Rule) =>
		dispatch({
			type: "SET_RULES",
			payload: updateLayerRule(rules, layer.id, edit),
		});

	const limited = own?.editableProperties;
	const groupOn = (g: string) => !limited || limited.includes(`group:${g}`);
	const tokensOnly = (g: string) =>
		Boolean(
			own?.values?.[`group:${g}`] && "tokensOnly" in own.values[`group:${g}`]
		);
	const allowedChildren = own?.structure?.allowedChildren;
	const names = Object.fromEntries(
		Object.values(nodes).map((n) => [n.id, n.name])
	);

	return (
		<div className="h-full overflow-y-auto pb-2">
			<p className="px-3 pt-3 pb-1 text-control text-muted-foreground">
				What editors and agents can change on{" "}
				<span className="font-medium text-foreground">{layer.name}</span>.
				Builders can always change everything.
			</p>

			{isContainer ? (
				<DesignerPane title="Structure">
					<Check
						label="Lock structure"
						hint="No adding, removing or moving the layers inside"
						checked={Boolean(own?.structure?.locked)}
						onChange={(locked) =>
							change((r) => ({ ...r, structure: { ...r.structure, locked } }))
						}
					/>
					{!own?.structure?.locked && (
						<>
							<Subhead>Layers editors can add inside</Subhead>
							{layerTypes.map((t) => (
								<Check
									key={t.type}
									label={t.name}
									checked={!allowedChildren || allowedChildren.includes(t.type)}
									onChange={(on) => {
										const current =
											allowedChildren ?? layerTypes.map((l) => l.type);
										const next = on
											? [...current, t.type]
											: current.filter((x) => x !== t.type);
										const all = layerTypes.every((l) => next.includes(l.type));
										change((r) => ({
											...r,
											structure: {
												...r.structure,
												allowedChildren: all ? undefined : next,
											},
										}));
									}}
								/>
							))}
						</>
					)}
				</DesignerPane>
			) : (
				<DesignerPane title="Content">
					<Check
						label={
							CONTENT_LABEL[layer.type] ?? "Editors can change its content"
						}
						checked={own?.content !== "locked"}
						onChange={(on) =>
							change((r) => ({ ...r, content: on ? undefined : "locked" }))
						}
					/>
				</DesignerPane>
			)}

			<DesignerPane title="Styles">
				<Check
					label="Limit which styles editors can change"
					hint={limited ? undefined : "Editors can change any style"}
					checked={Boolean(limited)}
					onChange={(on) =>
						change((r) => ({
							...r,
							editableProperties: on
								? GROUPS.map((g) => `group:${g}`)
								: undefined,
						}))
					}
				/>
				{limited && (
					<>
						<Subhead>Editors can change</Subhead>
						{GROUPS.map((g) => (
							<Check
								key={g}
								label={GROUP_LABELS[g]}
								checked={groupOn(g)}
								onChange={(on) =>
									change((r) => {
										const current = r.editableProperties ?? [];
										const key = `group:${g}`;
										return {
											...r,
											editableProperties: on
												? [...current, key]
												: current.filter((x) => x !== key),
										};
									})
								}
							/>
						))}
					</>
				)}
				<Subhead>Tokens only</Subhead>
				{GROUPS.map((g) => (
					<Check
						key={g}
						label={GROUP_LABELS[g]}
						checked={tokensOnly(g)}
						onChange={(on) =>
							change((r) => {
								const { [`group:${g}`]: _, ...rest } = r.values ?? {};
								return {
									...r,
									values: on
										? { ...rest, [`group:${g}`]: { tokensOnly: true } }
										: rest,
								};
							})
						}
					/>
				))}
			</DesignerPane>

			{others.length > 0 && (
				<DesignerPane title="Also covered by">
					<ul className="grid gap-2 px-1">
						{others.map((rule) => (
							<li key={rule.id} className="text-control">
								<span className="font-medium">{rule.id}</span>
								<span className="block text-caption text-muted-foreground">
									{rule.message ?? `Applies to ${scope(rule, names)}`}
								</span>
							</li>
						))}
					</ul>
				</DesignerPane>
			)}
		</div>
	);
};
