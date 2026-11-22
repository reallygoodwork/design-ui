import {
	removeDimension,
	removeModeValue,
	renameDimension,
	renameModeValue,
	renameToken,
	type Token,
	tokenCssValue,
} from "@design-ui/core";
import { useCallback } from "react";
import type { Layer } from "../lib/Types";
import { useDesignerAction } from "./useDesignerAction";
import { useLayers } from "./useLayers";
import { useTokens } from "./useTokens";

const flatten = (layers: Layer[]): Layer[] =>
	layers.flatMap((layer) => [layer, ...flatten(layer.children ?? [])]);

/** Layer properties set to exactly `var(--token)`, at every breakpoint. */
export const layerUsesOf = (layers: Layer[], path: string) => {
	const value = tokenCssValue(path);
	const uses: {
		layer: Layer;
		property: string;
		breakpointId: string | null;
	}[] = [];
	for (const layer of flatten(layers)) {
		for (const [property, v] of Object.entries(layer.cssVars ?? {})) {
			if (v === value) uses.push({ layer, property, breakpointId: null });
		}
		for (const [breakpointId, vars] of Object.entries(
			layer.breakpointCssVars ?? {}
		)) {
			for (const [property, v] of Object.entries(vars)) {
				if (v === value) uses.push({ layer, property, breakpointId });
			}
		}
	}
	return uses;
};

/** Changes to the token set that also keep layers pointing at the right tokens. */
export const useTokenEditing = () => {
	const { setTokens, setDimensions, breakpointOrder } = useTokens();
	const layers = useLayers();
	const dispatch = useDesignerAction();

	const update = useCallback(
		(path: string, change: (token: Token) => Token) =>
			setTokens((tokens) =>
				tokens.map((token) => (token.path === path ? change(token) : token))
			),
		[setTokens]
	);

	const add = useCallback(
		(token: Token) => setTokens((tokens) => [...tokens, token]),
		[setTokens]
	);

	/** Renames a token, its aliases, and every layer that uses it. */
	const rename = useCallback(
		(from: string, to: string) => {
			setTokens((tokens) => renameToken(tokens, from, to));
			for (const use of layerUsesOf(layers, from)) {
				dispatch({
					type: "UPDATE_LAYER_CSS",
					payload: {
						id: use.layer.id,
						css: { [use.property]: tokenCssValue(to) },
						// Base styles live on the smallest breakpoint.
						breakpointId: use.breakpointId ?? breakpointOrder[0],
					},
				});
			}
		},
		[setTokens, layers, dispatch, breakpointOrder]
	);

	/** Removes a token. Layers using it keep their `var()` and fall back. */
	const remove = useCallback(
		(path: string) =>
			setTokens((tokens) => tokens.filter((token) => token.path !== path)),
		[setTokens]
	);

	/** Modes: a dimension is a set like theme; its values are light, dark… */
	const modes = {
		addDimension: (name: string, values: string[]) =>
			setDimensions((dims) => ({ ...dims, [name]: values })),
		renameDimension: (from: string, to: string) => {
			setDimensions((dims) =>
				Object.fromEntries(
					Object.entries(dims).map(([key, values]) => [
						key === from ? to : key,
						values,
					])
				)
			);
			setTokens((tokens) => renameDimension(tokens, from, to));
		},
		removeDimension: (name: string) => {
			setDimensions(({ [name]: _removed, ...rest }) => rest);
			setTokens((tokens) => removeDimension(tokens, name));
		},
		addValue: (dimension: string, value: string) =>
			setDimensions((dims) => ({
				...dims,
				[dimension]: [...(dims[dimension] ?? []), value],
			})),
		renameValue: (dimension: string, from: string, to: string) => {
			setDimensions((dims) => ({
				...dims,
				[dimension]: (dims[dimension] ?? []).map((value) =>
					value === from ? to : value
				),
			}));
			setTokens((tokens) => renameModeValue(tokens, dimension, from, to));
		},
		/** The first value is the default and stays; its values are the tokens' defaults. */
		removeValue: (dimension: string, value: string) => {
			setDimensions((dims) => ({
				...dims,
				[dimension]: (dims[dimension] ?? []).filter((v) => v !== value),
			}));
			setTokens((tokens) => removeModeValue(tokens, dimension, value));
		},
	};

	return { update, add, rename, remove, modes };
};
