import { DesignActionPanel } from "../../components/DesignActionPanel";
import { Designer } from "../../components/Designer";
import { DesignerCanvas } from "../../components/DesignerCanvas";
import { DesignerContent } from "../../components/DesignerContent";
import { DesignerFrame } from "../../components/DesignerFrame";
import { DesignerHeader } from "../../components/DesignerHeader";
import { DesignerPane } from "../../components/DesignerPane";
import { DesignPanel } from "../../components/DesignerPanel";
import { DesignToolbarContainer } from "../../components/DesignToolbarContainer";
import { PaneLayerTree } from "../../components/PaneLayerTree";
import type { Breakpoint, Layer } from "../../lib/Types";

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
		<div className="h-screen w-screen">
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
