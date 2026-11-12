/**
 * A plain React app with no Tailwind, hosting the editor with only the built
 * stylesheet. Checks that the editor looks right and the host's own styles
 * don't change. Run: bun run build:css && bun run example:plain-host
 */
import React from "react";
import ReactDOM from "react-dom/client";
import "../../build/styles.css";
import "./host.css";
import { CSSPanel } from "../../src/components/CSSPanel";
import { Tabs } from "../../src/components/common/Tabs";
import { DesignActionPanel } from "../../src/components/DesignActionPanel";
import { Designer } from "../../src/components/Designer";
import { DesignerCanvas } from "../../src/components/DesignerCanvas";
import { DesignerContent } from "../../src/components/DesignerContent";
import { DesignerFrame } from "../../src/components/DesignerFrame";
import { DesignerHeader } from "../../src/components/DesignerHeader";
import { DesignerPane } from "../../src/components/DesignerPane";
import { DesignPanel } from "../../src/components/DesignerPanel";
import { DesignToolbarContainer } from "../../src/components/DesignToolbarContainer";
import { EditorPreviewToggle } from "../../src/components/EditorPreviewToggle";
import { ExportMenu } from "../../src/components/ExportMenu";
import { PaneLayerTree } from "../../src/components/PaneLayerTree";
import { RulesPanel } from "../../src/components/RulesPanel";
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
