import Editor from "@monaco-editor/react";
import { useActiveBreakpoint } from "../hooks/useActiveBreakpoint";
import { useEffectiveCss } from "../hooks/useBreakpointCss";
import { useSelectedLayers } from "../hooks/useSelectedLayers";
import { applyCssVars } from "../lib/cssPropertyMapping";
import { DesignerPane } from "./DesignerPane";

export const CSSPanel = () => {
	const layers = useSelectedLayers();
	const layer = layers[0];
	const css = applyCssVars(useEffectiveCss());
	const breakpoint = useActiveBreakpoint();
	const declarations = Object.entries(css)
		.map(
			([key, value]) =>
				`${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${value};`
		)
		.join("\n  ");
	const selector = `.${layer?.name.toLowerCase().replace(/\s+/g, "-")}`;
	const comment = breakpoint ? `/* ${breakpoint.name} */\n` : "";

	return (
		<DesignerPane title="CSS">
			{layer ? (
				<div className="rounded-sm border border-border">
					<Editor
						height="600px"
						theme="vs-dark"
						options={{
							minimap: {
								enabled: false,
							},
							lineNumbers: "off",
							wordWrap: "on",
							readOnly: true,
						}}
						defaultLanguage="css"
						value={`${comment}${selector} {
  ${declarations}
}`}
					/>
				</div>
			) : (
				<div className="rounded-sm border border-border p-4 text-center text-control text-muted-foreground">
					No layer selected
				</div>
			)}
		</DesignerPane>
	);
};
