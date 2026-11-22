import { type DesignDocument, exportPage, loadDocument } from "@design-ui/core";
import { DesignView } from "@design-ui/react";

// In a React app: render a saved design, styled per breakpoint and theme.
export const Launch = ({ file }: { file: unknown }) => {
	const result = loadDocument(file);
	if (!result.ok) return <p>This design can't be shown.</p>;
	return <DesignView document={result.document} mode={{ theme: "dark" }} />;
};

// Anywhere else: one HTML page, with the CSS inside it.
export const toHtml = (doc: DesignDocument) =>
	exportPage(doc, { title: "Spring launch" });
