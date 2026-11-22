/**
 * A plain React app with no Tailwind, hosting the editor with only the built
 * stylesheet. Checks that the editor looks right and the host's own styles
 * don't change. Run: bun run build:css && bun run example:plain-host
 */
import React from "react";
import ReactDOM from "react-dom/client";
import "@design-ui/react/styles.css";
import "./host.css";
import {
	CSSPanel,
	DesignActionPanel,
	Designer,
	DesignerCanvas,
	DesignerContent,
	DesignerFrame,
	DesignerHeader,
	DesignerPane,
	DesignPanel,
	DesignToolbarContainer,
	EditorPreviewToggle,
	ExportMenu,
	PaneLayerTree,
	RulesPanel,
	Tabs,
} from "@design-ui/react";
import { demoBreakpoints, demoLayers, demoRules } from "../../src/demo/design";
import { demoTokenDimensions, demoTokens } from "../../src/demo/tokens";

const Host = () => (
	<>
		<h1>Host page</h1>
		<p>
			A <a href="#editor">link to the editor</a>, a{" "}
			<button type="button">host button</button> and a list:
		</p>
		<ul>
			<li>First</li>
			<li>Second</li>
		</ul>
		<div className="p-2" data-testid="host-p2">
			Host .p-2: 2rem padding on hotpink.
		</div>
		<div className="editor" id="editor">
			<Designer
				layers={demoLayers}
				breakpoints={demoBreakpoints}
				tokens={demoTokens}
				tokenDimensions={demoTokenDimensions}
				rules={demoRules}
			>
				<DesignerHeader>
					<span>Embedded editor</span>
					<EditorPreviewToggle />
					<ExportMenu />
				</DesignerHeader>
				<DesignerContent>
					<DesignPanel>
						<DesignerPane>
							<PaneLayerTree />
						</DesignerPane>
					</DesignPanel>
					<div
						style={{
							position: "relative",
							display: "flex",
							flex: 1,
							minWidth: 0,
						}}
					>
						<DesignerCanvas>
							<DesignerFrame />
						</DesignerCanvas>
						<DesignToolbarContainer />
					</div>
					<DesignPanel>
						<Tabs
							items={[
								{
									label: "Styles",
									value: "styles",
									content: <DesignActionPanel />,
								},
								{ label: "CSS", value: "css", content: <CSSPanel /> },
								{ label: "Rules", value: "rules", content: <RulesPanel /> },
							]}
						/>
					</DesignPanel>
				</DesignerContent>
			</Designer>
		</div>
	</>
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<Host />
	</React.StrictMode>
);
