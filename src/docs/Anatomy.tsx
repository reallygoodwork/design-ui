import { useState } from "react";
import { cn } from "../lib/cn";
import { Code, displaySource } from "./Code";
import minimalEditor from "./examples/MinimalEditor.tsx?raw";

type Part = "header" | "tree" | "canvas" | "frame" | "actions" | "toolbar";

const descriptions: Record<Part, string> = {
	header: "DesignerHeader is an empty bar for your logo, save button or menus.",
	tree: "PaneLayerTree lists every layer. Select, rename, lock and drag to reorder.",
	canvas:
		"DesignerCanvas adds pan, zoom, selection and resize handles, and the keyboard shortcuts.",
	frame:
		"DesignerFrame draws one artboard per breakpoint, all showing the same layers.",
	actions:
		"DesignActionPanel holds the 30 style controls. Swap it for your own set.",
	toolbar: "DesignToolbarContainer floats undo, redo and zoom over the canvas.",
};

const partForLine = (line: string): Part | null => {
	if (line.includes("<DesignerHeader")) return "header";
	if (line.includes("<PaneLayerTree")) return "tree";
	if (line.includes("DesignerCanvas>")) return "canvas";
	if (line.includes("<DesignerFrame")) return "frame";
	if (line.includes("<DesignActionPanel")) return "actions";
	if (line.includes("<DesignToolbarContainer")) return "toolbar";
	return null;
};

const Region = ({
	part,
	label,
	active,
	onChange,
	className,
}: {
	part: Part;
	label: string;
	active: Part | null;
	onChange: (part: Part | null) => void;
	className?: string;
}) => (
	<button
		type="button"
		onMouseEnter={() => onChange(part)}
		onMouseLeave={() => onChange(null)}
		onFocus={() => onChange(part)}
		onBlur={() => onChange(null)}
		className={cn(
			"flex items-start overflow-hidden bg-background p-2 text-left [overflow-wrap:anywhere] text-[11px] text-muted-foreground outline-offset-[-2px] transition-colors sm:text-xs",
			active === part && "bg-(--docs-accent)! text-white",
			className
		)}
	>
		{label}
	</button>
);

const source = displaySource(minimalEditor);

export const Anatomy = () => {
	const [active, setActive] = useState<Part | null>(null);
	const shared = { active, onChange: setActive };

	return (
		<div className="grid gap-2">
			<div className="overflow-hidden rounded-lg border border-border bg-border">
				<div className="grid h-80 grid-cols-[1fr_2.2fr_1fr] grid-rows-[36px_1fr] gap-px">
					<Region
						part="header"
						label="DesignerHeader"
						className="col-span-3"
						{...shared}
					/>
					<Region part="tree" label="PaneLayerTree" {...shared} />
					<div className="relative">
						<Region
							part="canvas"
							label="DesignerCanvas"
							className="absolute inset-0 bg-muted"
							{...shared}
						/>
						<Region
							part="frame"
							label="DesignerFrame"
							className="absolute top-11 right-[18%] bottom-14 left-[18%] border border-border"
							{...shared}
						/>
						<Region
							part="toolbar"
							label="Toolbar"
							className="absolute bottom-3 left-1/2 h-8 w-24 -translate-x-1/2 items-center justify-center rounded-md border border-border"
							{...shared}
						/>
					</div>
					<Region part="actions" label="DesignActionPanel" {...shared} />
				</div>
			</div>
			<p aria-live="polite" className="min-h-6 text-muted-foreground text-sm">
				{active
					? descriptions[active]
					: "Point at a region or a highlighted line of code."}
			</p>
			<Code
				code={`// Imports hidden here. The copy button includes them.\n\n${source.slice(source.indexOf("const layers"))}`}
				copyText={source}
				title="Editor.tsx"
				partForLine={partForLine}
				activePart={active}
				onPartChange={(part) => setActive(part as Part | null)}
			/>
		</div>
	);
};
