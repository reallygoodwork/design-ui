import {
	indexTokens,
	resolveToken,
	tokenCssName,
	tokenFromCssValue,
	tokensToCssVars,
} from "@design-ui/core";
import { useMemo } from "react";
import { useLayers } from "../../hooks/useLayers";
import { modeAt, useTokens } from "../../hooks/useTokens";
import type { Layer } from "../../lib/Types";

const flatten = (layers: Layer[]): Layer[] =>
	layers.flatMap((layer) => [layer, ...flatten(layer.children ?? [])]);

// Ids and breakpoint ids end up in selectors.
const attr = (value: string) => JSON.stringify(value);

/**
 * Puts each token's value on each breakpoint frame as a custom property, so
 * layers can use `var(--token)`.
 */
export const TokenStyles = () => {
	const store = useTokens();
	const { tokens, mode: tokenMode, breakpointOrder } = store;

	const frameCss = useMemo(
		() =>
			breakpointOrder
				.map((id) => {
					const vars = tokensToCssVars(
						tokens,
						modeAt({ mode: tokenMode }, id),
						breakpointOrder
					);
					// `light-dark()` follows color-scheme, so a light or dark theme sets it.
					const theme = tokenMode.theme;
					const scheme =
						theme === "light" || theme === "dark"
							? `color-scheme:${theme};`
							: "";
					const body =
						scheme +
						Object.entries(vars)
							.map(([name, value]) => `${name}:${value};`)
							.join("");
					// Set on the shadow host; custom properties inherit into the frame.
					return `.breakpoint-frame[data-breakpoint-id=${attr(id)}] .breakpoint-content{${body}}`;
				})
				.join("\n"),
		[tokens, tokenMode, breakpointOrder]
	);

	if (store.tokens.length === 0) return null;
	return <style data-slot="token-styles">{frameCss}</style>;
};

/**
 * Outlines the layers using a hovered token, and shows a token on one
 * property before it's applied. Frames render this inside their shadow root,
 * since document styles can't reach design content.
 */
export const useTokenOverlayCss = () => {
	const store = useTokens();
	const layers = useLayers();
	const { tokens, mode: tokenMode, breakpointOrder, hover } = store;

	const hoverCss = useMemo(() => {
		if (!hover) return "";
		const byPath = indexTokens(tokens);
		const mode = modeAt({ mode: tokenMode }, breakpointOrder[0]);
		return flatten(layers)
			.filter((layer) =>
				Object.values(layer.cssVars ?? {}).some((value) => {
					const token = tokenFromCssValue(value, tokens);
					return (
						token &&
						resolveToken(
							token.path,
							mode,
							byPath,
							breakpointOrder
						).deps.includes(hover as string)
					);
				})
			)
			.map(
				(layer) =>
					`.designer-layer[data-layer-id=${attr(layer.id)}]>:first-child{outline:2px solid var(--accent);outline-offset:2px}`
			)
			.join("");
	}, [hover, tokens, tokenMode, breakpointOrder, layers]);

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

	return hoverCss + previewCss;
};
