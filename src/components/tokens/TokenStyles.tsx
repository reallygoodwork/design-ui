import { useMemo } from "react";
import { useLayers } from "../../hooks/useLayers";
import { modeAt, useTokens } from "../../hooks/useTokens";
import type { Layer } from "../../lib/Types";
import {
	indexTokens,
	resolveToken,
	tokenCssName,
	tokenFromCssValue,
	tokensToCssVars,
} from "../../lib/tokens";

const flatten = (layers: Layer[]): Layer[] =>
	layers.flatMap((layer) => [layer, ...flatten(layer.children ?? [])]);

// Ids and breakpoint ids end up in selectors.
const attr = (value: string) => JSON.stringify(value);

/**
 * Puts each token's value on each breakpoint frame as a custom property, so
 * layers can use `var(--token)`. Also outlines the layers using a hovered
 * token, and shows a token on one property before it's applied.
 */
export const TokenStyles = () => {
	const store = useTokens();
	const layers = useLayers();

	const frameCss = useMemo(
		() =>
			store.breakpointOrder
				.map((id) => {
					const vars = tokensToCssVars(
						store.tokens,
						modeAt(store, id),
						store.breakpointOrder
					);
					// `light-dark()` follows color-scheme, so a light or dark theme sets it.
					const theme = store.mode.theme;
					const scheme =
						theme === "light" || theme === "dark"
							? `color-scheme:${theme};`
							: "";
					const body =
						scheme +
						Object.entries(vars)
							.map(([name, value]) => `${name}:${value};`)
							.join("");
					return `.breakpoint-frame[data-breakpoint-id=${attr(id)}] [data-slot="designer-frame"]{${body}}`;
				})
				.join("\n"),
		[store.tokens, store.mode, store.breakpointOrder]
	);

	const hoverCss = useMemo(() => {
		if (!store.hover) return "";
		const byPath = indexTokens(store.tokens);
		const mode = modeAt(store, store.breakpointOrder[0]);
		return flatten(layers)
			.filter((layer) =>
				Object.values(layer.cssVars ?? {}).some((value) => {
					const token = tokenFromCssValue(value, store.tokens);
					return (
						token &&
						resolveToken(
							token.path,
							mode,
							byPath,
							store.breakpointOrder
						).deps.includes(store.hover as string)
					);
				})
			)
			.map(
				(layer) =>
					`.designer-layer[data-layer-id=${attr(layer.id)}]>:first-child{outline:2px solid var(--accent);outline-offset:2px}`
			)
			.join("");
	}, [store.hover, store.tokens, layers]);

	// A preview can cover several properties, like all four padding sides.
	const previewCss = store.preview
		? `.designer-layer[data-layer-id=${attr(store.preview.layerId)}]>:first-child{${store.preview.cssProperty
				.split(",")
				.map(
					(property) =>
						`${property.trim().slice(2)}:var(${tokenCssName(store.preview?.path ?? "")}) !important;`
				)
				.join("")}}`
		: "";

	if (store.tokens.length === 0) return null;
	return (
		<style data-slot="token-styles">{frameCss + hoverCss + previewCss}</style>
	);
};
