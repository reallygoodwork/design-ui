/**
 * An app that uses the packages the way anyone would: installed from their
 * tarballs, imported from their entry points only, styled by styles.css.
 * It embeds the editor with a rule set, saves the design, checks the saved
 * file against the format, and renders it with DesignView.
 */
import {
	type DesignDocument,
	type Layer,
	loadDocument,
	type Rule,
} from "@design-ui/core";
import {
	DesignActionPanel,
	Designer,
	DesignerCanvas,
	DesignerContent,
	DesignerFrame,
	DesignerHeader,
	DesignerPane,
	DesignPanel,
	DesignView,
	PaneLayerTree,
	useDesignerApi,
} from "@design-ui/react";
import "@design-ui/react/styles.css";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

const layers: Layer[] = [
	{
		id: "card",
		name: "Card",
		type: "frame",
		value: "",
		cssVars: {
			"--padding-block-start": "24px",
			"--padding-block-end": "24px",
			"--padding-inline-start": "24px",
			"--padding-inline-end": "24px",
			"--background-color": "#f4f4f5",
		},
		children: [
			{
				id: "heading",
				name: "Heading",
				type: "text",
				value: "Hello from the tarballs",
				elementType: "h1",
				cssVars: { "--font-size": "32px", "--color": "#18181b" },
			},
		],
	},
];

const breakpoints = [
	{
		id: "mobile",
		name: "Mobile",
		width: 375,
		height: 500,
		position: { x: 0, y: 0 },
	},
	{
		id: "desktop",
		name: "Desktop",
		width: 1024,
		height: 500,
		position: { x: 455, y: 0 },
	},
];

const rules: Rule[] = [
	{
		id: "card-locked",
		target: { layerIds: ["card"] },
		structure: { locked: true },
	},
	{
		id: "heading-text-only",
		target: { layerIds: ["heading"] },
		editableProperties: [],
		message: "The heading's style is fixed. Its text can change.",
	},
];

/** People using this app edit within the rules. */
const ROLE = "editor" as const;

const SaveButton = ({ onSave }: { onSave: (doc: DesignDocument) => void }) => {
	const { exportDocument } = useDesignerApi();
	return (
		<button
			type="button"
			data-testid="save"
			onClick={() => onSave(exportDocument())}
		>
			Save
		</button>
	);
};

const App = () => {
	const [saved, setSaved] = useState<DesignDocument | null>(null);
	const [problems, setProblems] = useState<string[]>([]);
	const save = (doc: DesignDocument) => {
		// What a server would do with the file: check it against the format.
		const result = loadDocument(JSON.parse(JSON.stringify(doc)));
		if (result.ok) {
			setSaved(result.document);
			setProblems([]);
		} else setProblems(result.problems.map((p) => `${p.path}: ${p.message}`));
	};
	return (
		<main style={{ fontFamily: "system-ui", padding: 16 }}>
			<div style={{ height: 520, border: "1px solid #ccc" }}>
				<Designer
					layers={layers}
					breakpoints={breakpoints}
					rules={rules}
					role={ROLE}
				>
					<DesignerHeader>
						<strong>Smoke test</strong>
						<SaveButton onSave={save} />
					</DesignerHeader>
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
					</DesignerContent>
				</Designer>
			</div>
			<h2>Saved design</h2>
			{problems.length > 0 && (
				<ul data-testid="problems">
					{problems.map((p) => (
						<li key={p}>{p}</li>
					))}
				</ul>
			)}
			<div
				data-testid="view"
				style={{ maxWidth: 375, border: "1px dashed #999" }}
			>
				{saved ? <DesignView document={saved} /> : <p>Press Save.</p>}
			</div>
		</main>
	);
};

const root = document.getElementById("root");
if (root)
	createRoot(root).render(
		<StrictMode>
			<App />
		</StrictMode>
	);
