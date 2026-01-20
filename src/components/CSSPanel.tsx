import Editor from "@monaco-editor/react";
import { useSelectedLayers } from "../hooks/useSelectedLayers";
import { DesignerPane } from "./DesignerPane";

export const CSSPanel = () => {
	const layers = useSelectedLayers();
	const layer = layers[0];
	const css = layer?.cssVars || {};
	const cssString = Object.entries(css)
		.map(([key, value]) => `${key}: ${value};`)
		.join("\n  ");

	return (
		<DesignerPane title="CSS">
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
					defaultValue={`:root {
	${cssString}
}`}
				/>
			</div>
		</DesignerPane>
	);
};
