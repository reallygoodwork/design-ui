import { IconTrash, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useLayers } from "../../hooks/useLayers";
import { layerUsesOf, useTokenEditing } from "../../hooks/useTokenEditing";
import { useTokens } from "../../hooks/useTokens";
import { cn } from "../../lib/cn";
import type { Layer } from "../../lib/Types";
import { dependentsOf, pathProblem, setModeValue } from "../../lib/tokenEdits";
import {
	BREAKPOINT_DIMENSION,
	type Token,
	type TokenIssue,
	type TokenTier,
	tokenCssName,
} from "../../lib/tokens";
import { Select } from "../common/Select";
import { TIER_LABEL, TIER_ORDER } from "./TokenList";
import { TokenValueField } from "./TokenValueField";

export const Field = ({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) => (
	<div className="grid grid-cols-[56px_1fr] items-center gap-2">
		<span className="text-caption text-muted-foreground">{label}</span>
		<div className="flex min-w-0 items-center gap-1">{children}</div>
	</div>
);

/** The shared Select, laid out like a text field: label on the left. */
export const selectClass =
	"min-w-0 flex-1 justify-between font-sans text-control";

const whenLabel = (when: Record<string, string>) =>
	Object.values(when).join(" · ");

/**
 * Everything about one token, editable: name, tier, values per mode and
 * description, plus where it's used, what's wrong, and delete.
 */
export const TokenEditor = ({
	token,
	issues,
	usedBy,
	onRenamed,
	onDeleted,
}: {
	token: Token;
	issues: TokenIssue[];
	usedBy: { layer: Layer; property: string }[];
	onRenamed: (path: string) => void;
	onDeleted: () => void;
}) => {
	const store = useTokens();
	const layers = useLayers();
	const edit = useTokenEditing();
	const dispatch = useDesignerAction();
	const [nameError, setNameError] = useState<string | null>(null);
	const [confirmDelete, setConfirmDelete] = useState(false);

	// Values a token can add: each non-default dimension value and breakpoint.
	const options = [
		...Object.entries(store.dimensions).flatMap(([dimension, values]) =>
			values.slice(1).map((value) => ({ [dimension]: value }))
		),
		...store.breakpointOrder
			.slice(1)
			.map((id) => ({ [BREAKPOINT_DIMENSION]: id })),
	].filter(
		(when) =>
			!(token.modes ?? []).some(
				(entry) => whenLabel(entry.when) === whenLabel(when)
			)
	);

	const dependents = dependentsOf(store.tokens, token.path);
	const layerUses = layerUsesOf(layers, token.path);

	return (
		<div className="mx-2 mb-2 flex flex-col gap-2 border-l-2 border-border py-2 pl-3 text-control">
			<Field label="Name">
				<input
					key={token.path}
					aria-label="Token name"
					defaultValue={token.path}
					aria-invalid={Boolean(nameError)}
					onChange={() => setNameError(null)}
					onKeyDown={(event) =>
						event.key === "Enter" && event.currentTarget.blur()
					}
					onBlur={(event) => {
						const next = event.target.value.trim();
						if (next === token.path) return;
						const problem = pathProblem(next, store.tokens, token.path);
						if (problem) {
							setNameError(problem);
							return;
						}
						edit.rename(token.path, next);
						onRenamed(next);
					}}
					className="h-7 min-w-0 flex-1 rounded-md bg-input px-2 font-mono text-value outline-none aria-invalid:ring-1 aria-invalid:ring-destructive focus-visible:ring-2 focus-visible:ring-ring"
				/>
			</Field>
			{nameError && (
				<p className="ml-[64px] text-caption text-destructive">{nameError}</p>
			)}
			<Field label="CSS">
				<code className="truncate font-mono text-value text-muted-foreground">
					{tokenCssName(token.path)}
				</code>
			</Field>
			<Field label="Tier">
				<Select
					ariaLabel="Tier"
					className={selectClass}
					value={token.tier}
					items={TIER_ORDER.map((tier) => ({
						label: TIER_LABEL[tier],
						value: tier,
					}))}
					onValueChange={(value) =>
						edit.update(token.path, (t) => ({ ...t, tier: value as TokenTier }))
					}
				/>
			</Field>

			<div className="flex flex-col gap-1">
				<span className="text-caption text-muted-foreground">Values</span>
				<Field label="Default">
					<TokenValueField
						label={`${token.path} default`}
						type={token.type}
						value={token.value}
						exclude={token.path}
						onCommit={(value) =>
							edit.update(token.path, (t) => ({ ...t, value }))
						}
					/>
				</Field>
				{token.modes?.map((entry) => (
					<Field key={whenLabel(entry.when)} label={whenLabel(entry.when)}>
						<TokenValueField
							label={`${token.path} ${whenLabel(entry.when)}`}
							type={token.type}
							value={entry.value}
							exclude={token.path}
							onCommit={(value) =>
								edit.update(token.path, (t) =>
									setModeValue(t, entry.when, value)
								)
							}
						/>
						<button
							type="button"
							aria-label={`Remove the ${whenLabel(entry.when)} value`}
							onClick={() =>
								edit.update(token.path, (t) =>
									setModeValue(t, entry.when, null)
								)
							}
							className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground"
						>
							<IconX className="size-3.5" />
						</button>
					</Field>
				))}
				{options.length > 0 && (
					<Field label="">
						<Select
							ariaLabel="Add a value for a mode"
							className={cn(selectClass, "text-muted-foreground")}
							value=""
							items={[
								{ label: "Add a value for…", value: "" },
								...options.map((when, index) => ({
									label: Object.entries(when)
										.map(([dimension, value]) => `${dimension}: ${value}`)
										.join(", "),
									value: String(index),
								})),
							]}
							onValueChange={(value) => {
								const when = value === "" ? undefined : options[Number(value)];
								if (when)
									edit.update(token.path, (t) =>
										setModeValue(t, when, t.value)
									);
							}}
						/>
					</Field>
				)}
			</div>

			<Field label="Note">
				<input
					key={`${token.path}-description`}
					aria-label="Description"
					defaultValue={token.description ?? ""}
					placeholder="What it's for"
					onKeyDown={(event) =>
						event.key === "Enter" && event.currentTarget.blur()
					}
					onBlur={(event) => {
						const description = event.target.value.trim() || undefined;
						if (description !== token.description) {
							edit.update(token.path, (t) => ({ ...t, description }));
						}
					}}
					className="h-7 min-w-0 flex-1 rounded-md bg-input px-2 text-control outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
				/>
			</Field>

			<Field label="Used by">
				{usedBy.length ? (
					<span className="flex flex-wrap gap-1">
						{usedBy.map(({ layer, property }) => (
							<button
								key={layer.id + property}
								type="button"
								onClick={() =>
									dispatch({
										type: "SELECT_LAYER",
										payload: { layerId: layer.id, shiftKey: false },
									})
								}
								className="rounded bg-input px-1.5 py-px text-caption hover:bg-hover"
							>
								{layer.name} · {property.slice(2)}
							</button>
						))}
					</span>
				) : (
					<span className="text-muted-foreground">No layers</span>
				)}
			</Field>

			{issues.map((issue) => (
				<div
					key={issue.id}
					className="flex flex-col gap-0.5 rounded-md bg-input/60 p-2 text-caption"
				>
					<span className="font-medium">{issue.title}</span>
					<span className="text-muted-foreground">{issue.detail}</span>
				</div>
			))}

			{confirmDelete ? (
				<div className="flex flex-col gap-1.5 rounded-md bg-destructive/10 p-2 text-caption">
					<span>
						{layerUses.length || dependents.length
							? `${[
									layerUses.length &&
										`${layerUses.length} layer value${layerUses.length > 1 ? "s" : ""}`,
									dependents.length &&
										`${dependents.length} token${dependents.length > 1 ? "s" : ""}`,
								]
									.filter(Boolean)
									.join(" and ")} use it and will fall back to their defaults.`
							: "Nothing uses it."}
					</span>
					<span className="flex gap-1">
						<button
							type="button"
							onClick={() => {
								edit.remove(token.path);
								onDeleted();
							}}
							className="h-6 rounded-md bg-destructive px-2 font-medium text-white hover:bg-destructive/90"
						>
							Delete {token.path}
						</button>
						<button
							type="button"
							onClick={() => setConfirmDelete(false)}
							className="h-6 rounded-md px-2 hover:bg-hover"
						>
							Cancel
						</button>
					</span>
				</div>
			) : (
				<button
					type="button"
					onClick={() => setConfirmDelete(true)}
					className="flex h-6 items-center gap-1 self-start rounded-md px-1.5 text-caption text-muted-foreground hover:bg-hover hover:text-destructive"
				>
					<IconTrash className="size-3.5" />
					Delete token
				</button>
			)}
		</div>
	);
};
