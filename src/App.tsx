import { BreakpointPropertiesPanel } from "./components/BreakpointPropertiesPanel";
import { CSSPanel } from "./components/CSSPanel";
import { Tabs } from "./components/common/Tabs";
import { DesignActionPanel } from "./components/DesignActionPanel";
import { Designer } from "./components/Designer";
import { DesignerCanvas } from "./components/DesignerCanvas";
import { DesignerContent } from "./components/DesignerContent";
import { DesignerFrame } from "./components/DesignerFrame";
import { DesignerHeader } from "./components/DesignerHeader";
import { DesignerPane } from "./components/DesignerPane";
import { DesignPanel } from "./components/DesignerPanel";
import { DesignToolbarContainer } from "./components/DesignToolbarContainer";
import { PaneLayerTree } from "./components/PaneLayerTree";
import type { Breakpoint, Layer } from "./lib/Types";

const initialLayers: Layer[] = [
	{
		id: "1",
		type: "text",
		name: "Text 1",
		value: "Hello World",
		cssVars: {
			"--font-size": "16px",
			"--color": "#000000",
		},
	},
	{
		id: "2",
		type: "frame",
		name: "Frame 1",
		value: "",
		cssVars: {
			"--background-color": "#00ff00",
		},
		children: [
			{
				id: "layer-1767983878663-j4ymau5vf",
				type: "text",
				name: "Text",
				value: "Hello World",
				cssVars: {
					"--font-size": "16px",
					"--color": "#000000",
				},
			},
		],
	},
	{
		id: "3",
		type: "image",
		name: "Image 1",
		value: "https://placehold.co/150",
		cssVars: {
			"--width": "150px",
			"--height": "150px",
		},
	},
];

// Define initial breakpoints (mobile-first: smallest to largest)
const initialBreakpoints: Breakpoint[] = [
	{
		id: "mobile",
		name: "Mobile",
		width: 375,
		height: 667,
		position: { x: 0, y: 0 },
	},
	{
		id: "tablet",
		name: "Tablet",
		width: 768,
		height: 1024,
		position: { x: 425, y: 0 },
	},
	{
		id: "desktop",
		name: "Desktop",
		width: 1440,
		height: 900,
		position: { x: 1243, y: 0 },
	},
];

function App() {
	return (
		<div className="flex h-screen w-screen isolate ds">
			<Designer layers={initialLayers} breakpoints={initialBreakpoints}>
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
						{/* Show breakpoint properties when frame selected, layer styles otherwise */}
						<BreakpointPropertiesPanel />
						<Tabs
							items={[
								{
									label: "Styles",
									value: "layer",
									content: <DesignActionPanel />,
								},
								{
									label: "CSS",
									value: "css",
									content: <CSSPanel />,
								},
							]}
						/>
					</DesignPanel>

					<DesignToolbarContainer />
				</DesignerContent>
			</Designer>
		</div>
	);
}

export default App;
