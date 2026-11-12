import { useEffect, useRef, useState } from "react";
import { ActionColor } from "../components/actions/ActionColor";
import { ActionFontSize } from "../components/actions/ActionFontSize";
import { ActionLetterSpacing } from "../components/actions/ActionLetterSpacing";
import { ActionLineHeight } from "../components/actions/ActionLineHeight";
import { ActionOpacity } from "../components/actions/ActionOpacity";
import { ActionTextAlign } from "../components/actions/ActionTextAlign";
import { ActionTextContent } from "../components/actions/ActionTextContent";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useHistory } from "../hooks/useHistory";
import type { Layer } from "../lib/Types";
import { LayerStage, Sandbox } from "./Sandbox";

const isSmallScreen = () => window.matchMedia("(max-width: 640px)").matches;

const headline = (small: boolean): Layer => ({
	id: "headline",
	type: "text",
	name: "Headline",
	value: "Build your own canvas editor",
	elementType: "h1",
	cssVars: {
		"--font-size": small ? "44px" : "72px",
		"--line-height": small ? "46px" : "72px",
		"--letter-spacing": small ? "-1px" : "-2px",
		"--font-weight": "600",
	},
});

const Handle = ({ className }: { className: string }) => (
	<span
		className={`absolute size-2 rounded-[1px] border border-(--docs-accent) bg-white ${className}`}
	/>
);

const SelectedHeadline = () => {
	const ref = useRef<HTMLDivElement>(null);
	const [size, setSize] = useState({ width: 0, height: 0 });

	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		const observer = new ResizeObserver(() => {
			setSize({
				width: Math.round(element.offsetWidth),
				height: Math.round(element.offsetHeight),
			});
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	return (
		<div ref={ref} className="relative [overflow-wrap:anywhere]">
			<LayerStage />
			<div
				aria-hidden="true"
				className="docs-selection pointer-events-none absolute -inset-2 border border-(--docs-accent)"
			>
				<span className="absolute -top-6 left-0 text-(--docs-accent) text-xs font-medium">
					Headline
				</span>
				<Handle className="-top-1 -left-1" />
				<Handle className="-top-1 -right-1" />
				<Handle className="-bottom-1 -left-1" />
				<Handle className="-right-1 -bottom-1" />
				<span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-(--docs-accent) px-1.5 py-0.5 text-[11px] text-white tabular-nums">
					{size.width} × {size.height}
				</span>
			</div>
		</div>
	);
};

const HeroPanelFooter = () => {
	const dispatch = useDesignerAction();
	const { canUndo } = useHistory();
	return (
		<div className="flex items-center justify-between gap-2 border-border border-t px-4 py-3 text-muted-foreground text-xs">
			<span>These are the real controls.</span>
			<button
				type="button"
				disabled={!canUndo}
				className="rounded font-medium text-foreground underline underline-offset-2 disabled:no-underline disabled:opacity-40"
				onClick={() => dispatch({ type: "UNDO" })}
			>
				Undo
			</button>
		</div>
	);
};

export const Hero = () => {
	const [layer] = useState(() => headline(isSmallScreen()));
	return (
		<Sandbox layers={[layer]} selectedId="headline">
			<div className="grid items-center gap-16 md:grid-cols-[minmax(0,1fr)_260px] md:gap-12">
				<SelectedHeadline />
				<div className="rounded-lg border border-border bg-background">
					<div className="grid gap-3 p-4">
						<ActionTextContent />
						<ActionFontSize />
						<ActionLineHeight />
						<ActionLetterSpacing />
						<ActionTextAlign />
						<ActionColor />
						<ActionOpacity />
					</div>
					<HeroPanelFooter />
				</div>
			</div>
		</Sandbox>
	);
};
