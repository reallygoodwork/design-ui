import type { Layer, LayerDefinition, LayerPreset } from "./types";

export type PresetEntry<T extends LayerDefinition = LayerDefinition> = {
	/** Unique across all types: `${type}:${preset.id}`. */
	key: string;
	layerType: T;
	preset: LayerPreset;
};

export type PresetGroup<T extends LayerDefinition = LayerDefinition> = {
	name: string;
	entries: PresetEntry<T>[];
};

/** Built-in groups come first, in this order. Any other group follows. */
const GROUP_ORDER = ["Layout", "Text", "Media"];
const FALLBACK_GROUP = "More layers";

/**
 * Every layer a person can add, grouped. A type with presets lists each one;
 * a type without them, such as a custom layer, is listed once by its name.
 */
export const groupLayerPresets = <T extends LayerDefinition>(
	layerTypes: T[]
): PresetGroup<T>[] => {
	const groups = new Map<string, PresetEntry<T>[]>();
	for (const layerType of layerTypes) {
		const presets: LayerPreset[] = layerType.presets ?? [
			{
				id: layerType.type,
				label: layerType.name,
				description: layerType.description ?? "",
				group: FALLBACK_GROUP,
			},
		];
		for (const preset of presets) {
			const entries = groups.get(preset.group) ?? [];
			entries.push({
				key: `${layerType.type}:${preset.id}`,
				layerType,
				preset,
			});
			groups.set(preset.group, entries);
		}
	}
	const rank = (name: string) => {
		const index = GROUP_ORDER.indexOf(name);
		return index === -1 ? GROUP_ORDER.length : index;
	};
	return [...groups]
		.map(([name, entries]) => ({ name, entries }))
		.sort((a, b) => rank(a.name) - rank(b.name));
};

/** A new layer from a preset: the type's defaults, then the preset's values. */
export const layerFromPreset = (
	{ layerType, preset }: PresetEntry,
	id: string
): Layer => {
	const defaults = layerType.defaultValues;
	const values = preset.values ?? {};
	return {
		...defaults,
		...values,
		id,
		type: layerType.type,
		cssVars: { ...defaults.cssVars, ...values.cssVars },
		...(preset.elementType ? { elementType: preset.elementType } : {}),
	};
};
