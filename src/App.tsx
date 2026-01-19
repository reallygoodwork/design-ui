import { ActionBackgroundColor } from "./components/actions/ActionBackgroundColor";
import { ActionBorder } from "./components/actions/ActionBorder";
import { ActionBorderRadius } from "./components/actions/ActionBorderRadius";
import { ActionColor } from "./components/actions/ActionColor";
import { ActionFontFamily } from "./components/actions/ActionFontFamily";
import { ActionFontSize } from "./components/actions/ActionFontSize";
import { ActionLetterSpacing } from "./components/actions/ActionLetterSpacing";
import { ActionLineHeight } from "./components/actions/ActionLineHeight";
import { ActionMargin } from "./components/actions/ActionMargin";
import { ActionOpacity } from "./components/actions/ActionOpacity";
import { ActionPadding } from "./components/actions/ActionPadding";
import { ActionPosition } from "./components/actions/ActionPosition";
import { ActionSize } from "./components/actions/ActionSize";
import { ActionTextAlign } from "./components/actions/ActionTextAlign";
import { ActionTextDecoration } from "./components/actions/ActionTextDecoration";
import { ActionTextShadow } from "./components/actions/ActionTextShadow";
import { ActionTextStyle } from "./components/actions/ActionTextStyle";
import { ActionTextTransform } from "./components/actions/ActionTextTransform";
import { Designer } from "./components/Designer";
import { DesignerCanvas } from "./components/DesignerCanvas";
import { DesignerContent } from "./components/DesignerContent";
import { DesignerFrame } from "./components/DesignerFrame";
import { DesignerHeader } from "./components/DesignerHeader";
import { DesignerPane } from "./components/DesignerPane";
import { DesignToolbarContainer } from "./components/DesignToolbarContainer";
import { DesignPanel } from "./components/design-panel";
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
					<DesignerHeader></DesignerHeader>
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
							<DesignerPane title="Layer">
								<ActionPosition />
								<ActionSize />
								<ActionPadding />
								<ActionMargin />
								<ActionOpacity />
								<ActionBorderRadius />
							</DesignerPane>
							<DesignerPane title="Color">
								<ActionBackgroundColor />
								<ActionColor />
								<ActionBorder />
							</DesignerPane>
							<DesignerPane title="Typography" showForLayerTypes={["text"]}>
								<ActionFontFamily />
								<ActionFontSize />
								<ActionLineHeight />
								<ActionLetterSpacing />
								<ActionTextAlign />
								<ActionTextStyle />
								<ActionTextDecoration />
								<ActionTextTransform />
								<ActionTextShadow />
							</DesignerPane>
						</DesignPanel>

						<DesignToolbarContainer />
					</DesignerContent>
				</Designer>
			</div>
		</DesignerProvider>
	);
}

export default App;
