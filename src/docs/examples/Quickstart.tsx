import type { Rule } from "@design-ui/core";
import * as UI from "@design-ui/react";

const page = { id: "mobile", name: "Mobile", width: 375, height: 667 };
const title = { id: "title", type: "text", name: "Title", value: "Hello" };

// Editors can change words and colors. Nothing else.
const rule: Rule = { id: "title", target: {}, editableProperties: ["--color"] };

export const Quickstart = ({ editAs }: { editAs: "builder" | "editor" }) => (
	<UI.Designer
		defaultLayers={[title]}
		breakpoints={[{ ...page, position: { x: 0, y: 0 } }]}
		rules={[rule]}
		role={editAs}
	>
		<UI.DesignerContent>
			<UI.DesignerCanvas>
				<UI.DesignerFrame />
			</UI.DesignerCanvas>
			<UI.DesignPanel>
				<UI.DesignActionPanel />
			</UI.DesignPanel>
		</UI.DesignerContent>
	</UI.Designer>
);
