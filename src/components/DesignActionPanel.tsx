import { ActionAlignItems } from "./actions/ActionAlignItems";
import { ActionBackgroundColor } from "./actions/ActionBackgroundColor";
import { ActionBorder } from "./actions/ActionBorder";
import { ActionBorderRadius } from "./actions/ActionBorderRadius";
import { ActionColor } from "./actions/ActionColor";
import { ActionDisplay } from "./actions/ActionDisplay";
import { ActionFlexDirection } from "./actions/ActionFlexDirection";
import { ActionFlexWrap } from "./actions/ActionFlexWrap";
import { ActionFontFamily } from "./actions/ActionFontFamily";
import { ActionFontSize } from "./actions/ActionFontSize";
import { ActionGap } from "./actions/ActionGap";
import { ActionGridLayout } from "./actions/ActionGridLayout";
import { ActionJustifyContent } from "./actions/ActionJustifyContent";
import { ActionLetterSpacing } from "./actions/ActionLetterSpacing";
import { ActionLineHeight } from "./actions/ActionLineHeight";
import { ActionMargin } from "./actions/ActionMargin";
import { ActionOpacity } from "./actions/ActionOpacity";
import { ActionPadding } from "./actions/ActionPadding";
import { ActionPosition } from "./actions/ActionPosition";
import { ActionSize } from "./actions/ActionSize";
import { ActionTextAlign } from "./actions/ActionTextAlign";
import { ActionTextDecoration } from "./actions/ActionTextDecoration";
import { ActionTextShadow } from "./actions/ActionTextShadow";
import { ActionTextStyle } from "./actions/ActionTextStyle";
import { ActionTextTransform } from "./actions/ActionTextTransform";
import { DesignerPane } from "./DesignerPane";

export const DesignActionPanel = () => {
	return (
		<>
			<DesignerPane title="Layer">
				<ActionPosition />
				<ActionSize />
				<ActionOpacity />
				<ActionBorderRadius />
			</DesignerPane>
			<DesignerPane title="Layout">
				<ActionDisplay />
				<ActionGridLayout />
				<ActionJustifyContent />
				<ActionAlignItems />
				<ActionFlexDirection />
				<ActionFlexWrap />
				<ActionGap />
				<ActionPadding />
				<ActionMargin />
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
		</>
	);
};
