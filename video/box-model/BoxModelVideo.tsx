import { IconLayoutGrid } from "@tabler/icons-react";
import { Fragment, type ReactNode } from "react";
import { ActionLayout } from "../../src/components/actions/ActionLayout";
import { DesignerPane } from "../../src/components/DesignerPane";
import { Sandbox } from "../../src/docs/Sandbox";
import { useDesignerSelector } from "../../src/hooks/useDesignerSelector";
import { useLayers } from "../../src/hooks/useLayers";
import { useLayerTypes } from "../../src/hooks/useLayerTypes";
import { TokensProvider, useTokens } from "../../src/hooks/useTokens";
import { getEffectiveStyles } from "../../src/lib/breakpointUtils";
import type { Layer } from "../../src/lib/Types";
import {
	type Token,
	tokenCssValue,
	tokensToCssVars,
} from "../../src/lib/tokens";
import { type Act, Stage } from "../kit";
import {
	countLoop,
	find,
	PortalHome,
	press,
	StoreBridge,
	tag,
	writeCss,
} from "../shared";
import "./box-model.css";

// The real box model, in the real Layout pane, beside a card on the canvas
// whose padding is tinted the way the diagram draws it.
//
// Beats: scrub the padding (all four sides move together), open "Use a
// token…", choose Left & right, hover two tokens (the card previews each),
// pick space.inset (left and right become token values, and the list under
// the diagram says which token is where), reset. The reset is the first
// frame.

type Pose = "start" | "poster";
type S = { pose: Pose };

const initial: S = { pose: "start" };
const poster: S = { pose: "poster" };
const REST = { x: 500, y: 668 };

const PADDING = [
	"--padding-block-start",
	"--padding-inline-end",
	"--padding-block-end",
	"--padding-inline-start",
];
const SCRUB_TO = 14;

const semantic = (path: string, value: string): Token => ({
	path,
	type: "dimension",
	tier: "semantic",
	value,
});

// Few enough that the token list fits beside the diagram without scrolling
// or being pushed up from the stage's foot
const TOKENS: Token[] = [
	semantic("space.tight", "8px"),
	semantic("space.inset", "24px"),
	semantic("space.section", "40px"),
	// Not spacing: listed after the suggestions, under its own heading
	semantic("radius.card", "12px"),
];

const text = (
	id: string,
	value: string,
	css: Record<string, string>
): Layer => ({
	id,
	type: "text",
	name: value,
	value,
	cssVars: { "--color": "#18181b", ...css },
});

const layersFor = (pose: Pose): Layer[] => [
	{
		id: "card",
		type: "frame",
		name: "Card",
		value: "",
		cssVars: {
			"--display": "flex",
			"--flex-direction": "column",
			"--row-gap": "6px",
			...(pose === "poster" && {
				"--padding-block-start": `${SCRUB_TO}px`,
				"--padding-block-end": `${SCRUB_TO}px`,
				"--padding-inline-start": tokenCssValue("space.inset"),
				"--padding-inline-end": tokenCssValue("space.inset"),
			}),
		},
		children: [
			text("eyebrow", "New", {
				"--font-size": "11px",
				"--font-weight": "600",
				"--color": "#155dfc",
			}),
			text("title", "Spring launch", {
				"--font-size": "20px",
				"--font-weight": "600",
			}),
			text("body", "Ships Friday to everyone on the list.", {
				"--font-size": "13px",
				"--color": "#52525b",
			}),
		],
	},
];

const writePadding = (value: string) =>
	writeCss("card", Object.fromEntries(PADDING.map((p) => [p, value])));

/**
 * The layers through their own renderers, as the docs' LayerStage does, with
 * the token being hovered in the list shown on the card before it's picked,
 * and the tokens' custom properties defined around them.
 */
const Canvas = () => {
	const layers = useLayers();
	const layerTypes = useLayerTypes();
	const breakpoints = useDesignerSelector((state) => state.breakpoints);
	const activeId = useDesignerSelector((state) => state.activeBreakpointId);
	const tokens = useTokens();
	const preview = tokens.preview;
	const vars = tokensToCssVars(
		tokens.tokens,
		tokens.mode,
		tokens.breakpointOrder
	);

	const render = (layer: Layer): ReactNode => {
		const type = layerTypes.find((t) => t.type === layer.type);
		if (!type) return null;
		const css = activeId
			? getEffectiveStyles(layer, activeId, breakpoints)
			: { ...layer.cssVars };
		if (preview?.layerId === layer.id) {
			for (const property of preview.cssProperty.split(",")) {
				css[property] = tokenCssValue(preview.path);
			}
		}
		return (
			<Fragment key={layer.id}>
				{type.render(
					{ ...layer, style: {}, effectiveCssVars: css },
					layer.children?.map(render),
					layer.elementType ?? type.elementType
				)}
			</Fragment>
		);
	};

	return (
		<div className="bm-canvas" style={vars}>
			<div className="bm-page">
				{layers.map(render)}
				<div className="bm-filler" aria-hidden="true">
					<span style={{ width: "72%" }} />
					<span style={{ width: "88%" }} />
					<span style={{ width: "54%" }} />
				</div>
				<div className="bm-ghost" aria-hidden="true" />
			</div>
		</div>
	);
};

const chip = (side: string) => find(`input[aria-label="Padding ${side}"]`);

/** Hover a token in the list: the cursor over it, and the real hover event. */
const hoverToken = async (a: Act<S>, path: string) => {
	// A token's row reads its path then its value, like "space.inset24px"
	const button = Array.from(
		document.querySelectorAll<HTMLElement>("#example .ds-popup button")
	).find((el) => el.querySelector("span.truncate")?.textContent === path);
	await a.move({ at: tag(path, button) });
	button?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
	return button;
};

async function script(a: Act<S>) {
	countLoop();
	await a.wait(800);

	a.mark("scrub");
	tag("top", chip("top"));
	await a.move({ at: "top", x: 0.2, y: 0.5 });
	await a.drag(
		{ x: a.center("top").x + 60, y: a.center("top").y },
		(_at, _from, t) => writePadding(`${Math.round(SCRUB_TO * t)}px`),
		{ duration: 1100 }
	);
	writePadding(`${SCRUB_TO}px`);
	await a.wait(1000);

	a.mark("where");
	await press(a, "use-token", find("[data-box-model] button", "Use a token…"));
	await a.wait(700);
	await press(
		a,
		"sides",
		find('.ds-popup [aria-label="Sides"] button', "Left & right")
	);
	await a.wait(600);

	a.mark("preview");
	await hoverToken(a, "space.section");
	await a.wait(900);
	const inset = await hoverToken(a, "space.inset");
	await a.wait(900);

	a.mark("pick");
	await press(a, "space.inset", inset);
	await a.wait(250);
	// Closing hands focus back to "Use a token…"; nobody pressed a key
	(document.activeElement as HTMLElement | null)?.blur();
	// Hold on the result: the values on the diagram, the token row under it
	await a.wait(1950);

	a.mark("reset");
	await press(a, "reset", find('[aria-label="Reset padding and margin"]'));
	(document.activeElement as HTMLElement | null)?.blur();
	await a.wait(900);
	await a.move(REST);
	await a.wait(400);
}

export const BoxModelVideo = () => (
	<Stage
		width={560}
		height={700}
		initial={initial}
		poster={poster}
		script={script}
		play="loop"
		cursor={{ at: REST, style: "large", idle: false }}
		keys="bottom-left"
		className="bm"
	>
		{(s) => (
			<PortalHome className="bm-scene">
				<Sandbox key={s.pose} layers={layersFor(s.pose)} selectedId="card">
					<TokensProvider tokens={TOKENS}>
						<StoreBridge />
						<Canvas />
						<div className="bm-panel">
							<DesignerPane
								title="Layout"
								category="layout"
								icon={<IconLayoutGrid />}
							>
								<ActionLayout />
							</DesignerPane>
						</div>
					</TokensProvider>
				</Sandbox>
			</PortalHome>
		)}
	</Stage>
);
