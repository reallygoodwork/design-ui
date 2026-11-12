import { Dialog } from "@base-ui/react/dialog";
import {
	acceptsChildren,
	groupLayerPresets,
	layerFromPreset,
	type PresetEntry,
} from "@design-ui/core";
import { IconSearch } from "@tabler/icons-react";
import { Command } from "cmdk";
import { useMemo } from "react";
import { useAllowed } from "../hooks/useAllowed";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { useLayerTypes } from "../hooks/useLayerTypes";
import type { LayerType } from "../lib/Types";

const newLayerId = () =>
	`layer-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

const PLACEMENT = {
	before: "Adds before",
	after: "Adds after",
	inside: "Adds inside",
} as const;

/**
 * Word-prefix matching, not fuzzy: "title" should find headings, not
 * "Ar-ti-cle". Names rank above keywords, which rank above descriptions.
 * cmdk passes keywords as [label, description, ...keywords].
 */
const filterLayers = (_value: string, search: string, keywords?: string[]) => {
	const query = search.trim().toLowerCase();
	if (!query) return 1;
	const [label = "", description = "", ...extra] = (keywords ?? []).map((k) =>
		k.toLowerCase()
	);
	const startsWord = (text: string) =>
		text.split(/[\s<>/-]+/).some((word) => word.startsWith(query));
	if (label.startsWith(query)) return 1;
	if (startsWord(label)) return 0.9;
	if (extra.some(startsWord)) return 0.7;
	if (startsWord(description)) return 0.3;
	return 0;
};

/** The type's shortcut adds its plain version, so only that row shows it. */
const shortcutFor = ({ layerType, preset }: PresetEntry<LayerType>) =>
	preset.elementType || preset.values ? undefined : layerType.keybinding?.label;

const Row = ({
	entry,
	onSelect,
}: {
	entry: PresetEntry<LayerType>;
	onSelect: (entry: PresetEntry<LayerType>) => void;
}) => {
	const { layerType, preset } = entry;
	const shortcut = shortcutFor(entry);
	return (
		<Command.Item
			value={entry.key}
			keywords={[preset.label, preset.description, ...(preset.keywords ?? [])]}
			onSelect={() => onSelect(entry)}
			className="flex cursor-default items-center gap-3 rounded-md px-2 py-1.5 outline-none data-[selected=true]:bg-hover data-[selected=true]:text-hover-foreground"
		>
			<span
				aria-hidden="true"
				className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground [&_svg]:size-4"
			>
				{layerType.icon}
			</span>
			<span className="min-w-0 flex-1">
				<span className="flex items-baseline gap-2">
					<span className="font-medium text-control">{preset.label}</span>
					{preset.elementType && (
						<span className="font-mono text-muted-foreground text-value">
							{`<${preset.elementType}>`}
						</span>
					)}
				</span>
				{preset.description && (
					<span className="block truncate text-caption text-muted-foreground">
						{preset.description}
					</span>
				)}
			</span>
			{shortcut && (
				<kbd className="shrink-0 rounded border border-border px-1.5 font-mono text-muted-foreground text-value">
					{shortcut}
				</kbd>
			)}
		</Command.Item>
	);
};

/** Every layer you can add, grouped and searchable, opened from a layer's + buttons. */
export const AddLayerDialog = () => {
	const { state } = useDesignerContext();
	const designerAction = useDesignerAction();
	const layerTypes = useLayerTypes();
	const dialogState = state.addLayerDialog;
	// Only what the editing rules let the role add where the layer would go.
	const parentId =
		dialogState?.position === "inside"
			? dialogState.layerId
			: dialogState
				? (state.nodes[dialogState.layerId]?.parentId ?? undefined)
				: undefined;
	const limits = useAllowed(parentId);
	const groups = useMemo(
		() =>
			acceptsChildren(limits)
				? groupLayerPresets(
						layerTypes.filter(
							(t) =>
								!limits.allowedChildren ||
								limits.allowedChildren.includes(t.type)
						)
					)
				: [],
		[layerTypes, limits]
	);

	if (!dialogState) return null;

	const target = state.nodes[dialogState.layerId];

	const close = () => designerAction({ type: "CLOSE_ADD_LAYER_DIALOG" });

	const add = (entry: PresetEntry<LayerType>) => {
		const layer = layerFromPreset(entry, newLayerId());
		designerAction({
			type: "ADD_LAYER",
			payload: {
				layer,
				targetLayerId: dialogState.layerId,
				position: dialogState.position,
			},
		});
		designerAction({
			type: "SELECT_LAYER",
			payload: { layerId: layer.id, shiftKey: false },
		});
		close();
	};

	return (
		<Dialog.Root
			open={dialogState.open}
			onOpenChange={(open) => {
				if (!open) close();
			}}
		>
			<Dialog.Portal className="ds">
				<Dialog.Backdrop className="ds-backdrop fixed inset-0 z-50 bg-black/40" />
				<Dialog.Popup className="ds-dialog ds-surface ds fixed top-[15vh] left-1/2 z-50 flex max-h-[70vh] w-[calc(100%-32px)] max-w-[480px] -translate-x-1/2 flex-col overflow-hidden font-sans text-foreground">
					<Command
						label="Add layer"
						loop
						filter={filterLayers}
						className="flex min-h-0 flex-col"
					>
						<div className="flex items-center gap-2 border-border border-b px-3">
							<IconSearch
								aria-hidden="true"
								className="size-4 shrink-0 text-muted-foreground"
							/>
							<Command.Input
								placeholder="Search layers"
								className="h-11 w-full min-w-0 bg-transparent text-control outline-none placeholder:text-muted-foreground"
							/>
						</div>
						<div className="flex items-baseline justify-between gap-2 px-3 pt-2.5">
							<Dialog.Title className="font-medium text-caption text-muted-foreground">
								Add layer
							</Dialog.Title>
							{target && (
								<Dialog.Description className="min-w-0 truncate text-caption text-muted-foreground">
									{PLACEMENT[dialogState.position]}{" "}
									<span className="text-foreground">{target.name}</span>
								</Dialog.Description>
							)}
						</div>
						<Command.List className="min-h-0 overflow-y-auto overscroll-contain p-1.5 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:text-muted-foreground">
							<Command.Empty className="px-2 py-8 text-center text-control text-muted-foreground">
								{groups.length === 0
									? "The editing rules don't allow adding layers here."
									: "No layers match your search."}
							</Command.Empty>
							{groups.map((group) => (
								<Command.Group key={group.name} heading={group.name}>
									{group.entries.map((entry) => (
										<Row key={entry.key} entry={entry} onSelect={add} />
									))}
								</Command.Group>
							))}
						</Command.List>
					</Command>
					<div className="flex gap-3 border-border border-t px-3 py-2 text-caption text-muted-foreground">
						<span>
							<kbd className="font-mono">↑↓</kbd> to move
						</span>
						<span>
							<kbd className="font-mono">Enter</kbd> to add
						</span>
						<span>
							<kbd className="font-mono">Esc</kbd> to close
						</span>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
