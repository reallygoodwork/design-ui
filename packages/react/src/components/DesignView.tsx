import {
	designCss,
	designHtml,
	type LayerDefinition,
	type RenderableDocument,
	type TokenMode,
} from "@design-ui/core";
import { useId, useMemo } from "react";

/**
 * Renders a saved design outside the editor, responsive at every breakpoint,
 * from the same HTML and CSS as the export. Each instance scopes its styles
 * to its own root, so several designs can share a page.
 */
export const DesignView = ({
	document,
	mode = {},
	layerTypes,
	className,
}: {
	document: RenderableDocument;
	/** The token mode to show, like `{ theme: "dark" }`. Defaults to each dimension's first value. */
	mode?: TokenMode;
	/** Layer types beyond the built-in ones. */
	layerTypes?: LayerDefinition[];
	className?: string;
}) => {
	const root = `design-${useId().replace(/[^\w-]/g, "")}`;
	const { css, html } = useMemo(
		() => ({
			css: designCss(document, { rootClass: root, layerTypes }),
			html: designHtml(document, { layerTypes }),
		}),
		[document, root, layerTypes]
	);
	const modeAttributes = Object.fromEntries(
		Object.entries(mode).map(([dimension, value]) => [
			`data-${dimension}`,
			value,
		])
	);
	return (
		<>
			<style>{css}</style>
			<div
				className={className ? `${root} ${className}` : root}
				{...modeAttributes}
				// The markup is built and escaped by designHtml from the document.
				// biome-ignore lint/security/noDangerouslySetInnerHtml: generated, escaped markup
				dangerouslySetInnerHTML={{ __html: html }}
			/>
		</>
	);
};
