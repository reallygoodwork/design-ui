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
import { DesignerProvider } from "./context/DesignerContext";
import type { Layer } from "./lib/Types";

const initialLayers: Layer[] = [
	{
		id: "1",
		type: "text",
		name: "Text 1",
		value: "Hello World",
		cssVars: {
			// "--width": "200px",
			// "--height": "100px",
			"--font-size": "16px",
			"--color": "#000000",
		},
	},
	{
		id: "2",
		type: "frame",
		name: "Text 1",
		value: "Hello World",
		cssVars: {
			"--background-color": "#00ff00",
			// "--width": "200px",
			// "--height": "100px",
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

function App() {
	return (
		<DesignerProvider>
			<div className="flex h-screen w-screen isolate ds">
				<Designer
					layers={initialLayers}
					frameSize={{ width: 600, height: 600 }}
				>
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
		</DesignerProvider>
	);
}

export default App;
