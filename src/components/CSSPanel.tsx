import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useActiveBreakpoint } from "../hooks/useActiveBreakpoint";
import { useEffectiveCss } from "../hooks/useBreakpointCss";
import { useSelectedLayers } from "../hooks/useSelectedLayers";
import { modeAt, useTokens } from "../hooks/useTokens";
import { applyCssVars } from "../lib/cssPropertyMapping";
import { layerCssText } from "../lib/cssText";
import { tokensToCssVars } from "../lib/tokens";
import { DesignerPane } from "./DesignerPane";

/** The selected layer's CSS at the active breakpoint, ready to copy. */
export const CSSPanel = () => {
	const [layer] = useSelectedLayers();
	const styles = applyCssVars(useEffectiveCss());
	const breakpoint = useActiveBreakpoint();
	const tokens = useTokens();
	const [copied, setCopied] = useState(false);

	const tokenVars = useMemo(
		() =>
			tokensToCssVars(
				tokens.tokens,
				modeAt(tokens, breakpoint?.id),
				tokens.breakpointOrder
			),
		[tokens, breakpoint?.id]
	);

	if (!layer) {
		return (
			<DesignerPane title="CSS">
				<p className="p-4 text-center text-control text-muted-foreground">
					Select a layer to see its CSS.
				</p>
			</DesignerPane>
		);
	}

	const text = layerCssText({
		selector: `.${layer.name.toLowerCase().trim().replace(/\s+/g, "-")}`,
		styles: styles as Record<string, string | number | undefined>,
		tokenVars,
		comment: breakpoint?.name,
	});

	return (
		<DesignerPane title="CSS">
			<div className="relative rounded-md border border-border bg-muted">
				<button
					type="button"
					aria-label="Copy CSS"
					onClick={() =>
						navigator.clipboard?.writeText(text).then(() => {
							setCopied(true);
							setTimeout(() => setCopied(false), 1500);
						})
					}
					className="absolute top-1.5 right-1.5 inline-flex size-6 items-center justify-center rounded bg-muted text-muted-foreground hover:bg-hover hover:text-foreground"
				>
					{copied ? (
						<IconCheck className="size-3.5" aria-hidden="true" />
					) : (
						<IconCopy className="size-3.5" aria-hidden="true" />
					)}
				</button>
				<span className="sr-only" role="status">
					{copied ? "Copied" : ""}
				</span>
				<pre className="overflow-x-auto overscroll-x-contain p-3 pr-9 font-mono text-value text-foreground leading-relaxed">
					<code>{text}</code>
				</pre>
			</div>
		</DesignerPane>
	);
};
