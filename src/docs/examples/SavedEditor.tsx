import { type DesignDocument, loadDocument } from "@design-ui/core";
import { Designer, DesignerHeader, useDesignerApi } from "@design-ui/react";
import type { ReactNode } from "react";

// Check a saved file before using it: old versions are migrated, and a
// broken one comes back with the problems instead of a half-loaded design.
const read = (): DesignDocument | null => {
	const saved = localStorage.getItem("design");
	const result = saved ? loadDocument(JSON.parse(saved)) : null;
	return result?.ok ? result.document : null;
};

const SaveButton = () => {
	const { exportDocument } = useDesignerApi();
	const save = () =>
		localStorage.setItem("design", JSON.stringify(exportDocument()));
	return (
		<button type="button" onClick={save}>
			Save
		</button>
	);
};

export const SavedEditor = ({ children }: { children: ReactNode }) => {
	const doc = read();
	return (
		<Designer
			defaultLayers={doc?.layers}
			breakpoints={doc?.breakpoints}
			frameStyles={doc?.frameStyles}
			tokens={doc?.tokens ? [...doc.tokens] : undefined}
			tokenDimensions={doc?.tokenDimensions}
			rules={doc?.rules}
			annotations={doc?.annotations}
		>
			<DesignerHeader>
				<SaveButton />
			</DesignerHeader>
			{children}
		</Designer>
	);
};
