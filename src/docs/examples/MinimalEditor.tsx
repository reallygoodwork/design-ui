import type { Breakpoint, Layer } from "@design-ui/react";
import {
	DesignActionPanel,
	Designer,
	DesignerCanvas,
	DesignerContent,
	DesignerFrame,
	DesignerHeader,
	DesignerPane,
	DesignPanel,
	DesignToolbarContainer,
	PaneLayerTree,
} from "@design-ui/react";

const layers: Layer[] = [
	{ id: "1", type: "text", name: "Title", value: "Hello" },
];

const breakpoints: Breakpoint[] = [
	{
		id: "mobile",
		name: "Mobile",
		width: 375,
		height: 667,
		position: { x: 0, y: 0 },
	},
];

export function MinimalEditor() {
	return (
		<div style={{ height: "100vh" }}>
			<Designer defaultLayers={layers} breakpoints={breakpoints}>
				<DesignerHeader />
				<DesignerContent>
					<DesignPanel>
						<DesignerPane>
							<PaneLayerTree />
						</DesignerPane>
					</DesignPanel>
					<DesignerCanvas>
						<DesignerFrame />
					</DesignerCanvas>
					<DesignPanel>
						<DesignActionPanel />
					</DesignPanel>
					<DesignToolbarContainer />
				</DesignerContent>
			</Designer>
		</div>
	);
}
