import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActionAlignItems } from "../components/actions/ActionAlignItems";
import { ActionBorder } from "../components/actions/ActionBorder";
import { ActionDisplay } from "../components/actions/ActionDisplay";
import { ActionFlexDirection } from "../components/actions/ActionFlexDirection";
import { ActionFlexWrap } from "../components/actions/ActionFlexWrap";
import { ActionGridLayout } from "../components/actions/ActionGridLayout";
import { ActionJustifyContent } from "../components/actions/ActionJustifyContent";
import { ActionMargin } from "../components/actions/ActionMargin";
import { ActionPosition } from "../components/actions/ActionPosition";
import { ActionTextAlign } from "../components/actions/ActionTextAlign";
import { ActionTextDecoration } from "../components/actions/ActionTextDecoration";
import { ActionTextShadow } from "../components/actions/ActionTextShadow";
import { ActionTextStyle } from "../components/actions/ActionTextStyle";
import { ActionTextTransform } from "../components/actions/ActionTextTransform";
import { DesignerProvider } from "../context/DesignerContext";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { breakpoints, defaultLayerTypes, makeLayer } from "../test/fixtures";
import { applyCssVars } from "./cssPropertyMapping";
import { frameLayerType } from "./layers/frame";
import { imageLayerType } from "./layers/image";
import { inputLayerType } from "./layers/input";
import { textLayerType } from "./layers/text";
import type { CSSVars, LayerType } from "./Types";

type Ctx = ReturnType<typeof useDesignerContext>;
type Dispatch = ReturnType<typeof useDesignerAction>;
const ref: { dispatch: Dispatch | null; ctx: Ctx | null } = {
	dispatch: null,
	ctx: null,
};
const Capture = () => {
	ref.dispatch = useDesignerAction();
	ref.ctx = useDesignerContext();
	return null;
};

beforeEach(() => {
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
	);
	Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

const FLEX = { "--display": "flex" };
const GRID = { "--display": "grid" };

/** Mount a control with a selected layer and return a getter for its cssVars. */
const mount = (Control: ComponentType, layerType: string, cssVars: CSSVars) => {
	render(
		<DesignerProvider
			defaultLayers={[
				makeLayer("L", undefined, { type: layerType, value: "Hi", cssVars }),
			]}
			defaultLayerTypes={defaultLayerTypes.concat(inputLayerType)}
			breakpoints={breakpoints}
		>
			<Capture />
			<Control />
		</DesignerProvider>
	);
	act(() => {
		ref.dispatch?.({
			type: "SELECT_LAYER",
			payload: { layerId: "L", shiftKey: false, breakpointId: "mobile" },
		});
	});
	return () => ({ ...(ref.ctx?.state.layers[0]?.cssVars ?? {}) });
};

/** Render a layer of the given type with the given css vars; return its element. */
const renderLayer = (layerType: LayerType, cssVars: CSSVars) => {
	const { container } = render(
		<div>
			{layerType.render({
				id: "R",
				name: "R",
				type: layerType.type,
				value: "Hi",
				cssVars,
				style: {},
				effectiveCssVars: cssVars,
			})}
		</div>
	);
	return container.firstElementChild?.firstElementChild as HTMLElement;
};

const openPopover = (name: RegExp | string) => {
	const label = screen.getByText(name);
	const action = label.closest("[data-slot=action]") as HTMLElement;
	fireEvent.click(within(action).getAllByRole("button")[0]);
};

const numericInput = (label: string) => {
	const action = screen
		.getAllByText(label)
		.map((el) => el.closest("[data-slot=action]") as HTMLElement)
		.find((el) => el?.querySelector("input")) as HTMLElement;
	return action.querySelector("input") as HTMLInputElement;
};

/**
 * Click every toggle button in a group and collect the non-empty value each
 * writes for `cssVar`.
 */
const toggleValues = (
	Control: ComponentType,
	layerType: string,
	cssVars: CSSVars,
	cssVar: string
) => {
	const getVars = mount(Control, layerType, cssVars);
	const group = screen.getAllByRole("group")[0];
	const values: string[] = [];
	for (const button of within(group).getAllByRole("button")) {
		for (let attempt = 0; attempt < 2; attempt++) {
			fireEvent.click(button);
			const v = getVars()[cssVar];
			if (v) {
				values.push(v);
				break;
			}
		}
	}
	return values;
};

// --- Table 1: control -> dispatched css -> rendered inline style ----------

type Case = {
	name: string;
	run: () => CSSVars | Promise<CSSVars>;
	layer: LayerType;
	expected: Record<string, string>;
};

const cases: Case[] = [
	{
		name: "FlexWrap Wrap",
		layer: frameLayerType,
		run: () => {
			const get = mount(ActionFlexWrap, "frame", FLEX);
			fireEvent.click(screen.getByRole("button", { name: "Wrap" }));
			return get();
		},
		expected: { "flex-wrap": "wrap" },
	},
	{
		name: "FlexWrap No Wrap",
		layer: frameLayerType,
		run: () => {
			const get = mount(ActionFlexWrap, "frame", {
				...FLEX,
				"--flex-wrap": "wrap",
			});
			fireEvent.click(screen.getByRole("button", { name: "No Wrap" }));
			return get();
		},
		expected: { "flex-wrap": "nowrap" },
	},
	{
		name: "GridLayout columns",
		layer: frameLayerType,
		run: () => {
			const get = mount(ActionGridLayout, "frame", GRID);
			openPopover("Grid Layout");
			const columns = screen.getByText("Columns").closest("[data-slot=action]");
			fireEvent.click(
				within(columns as HTMLElement).getByRole("button", {
					name: /increase/i,
				})
			);
			return get();
		},
		expected: {
			display: "grid",
			"grid-template-columns": "repeat(4, 1fr)",
			"grid-template-rows": "repeat(3, 1fr)",
		},
	},
	...(
		[
			["Top", { "margin-block-start": "10px" }],
			["Right", { "margin-inline-end": "10px" }],
			["Bottom", { "margin-block-end": "10px" }],
			["Left", { "margin-inline-start": "10px" }],
		] as const
	).flatMap(([side, expected]) =>
		[frameLayerType, textLayerType].map(
			(layer): Case => ({
				name: `Margin ${side} on ${layer.type}`,
				layer,
				run: () => {
					const get = mount(ActionMargin, layer.type, {});
					openPopover("Margin");
					fireEvent.change(numericInput(side), { target: { value: "10" } });
					return get();
				},
				expected,
			})
		)
	),
	{
		name: "Margin Top on input",
		layer: inputLayerType,
		run: () => {
			const get = mount(ActionMargin, "input", {});
			openPopover("Margin");
			fireEvent.change(numericInput("Top"), { target: { value: "10" } });
			return get();
		},
		expected: { "margin-block-start": "10px" },
	},
	{
		name: "Position type",
		layer: frameLayerType,
		run: async () => {
			const get = mount(ActionPosition, "frame", {});
			openPopover("Position");
			await userEvent.click(screen.getAllByRole("combobox")[0]);
			await userEvent.click(
				await screen.findByRole("option", { name: "absolute" })
			);
			return get();
		},
		expected: { position: "absolute" },
	},
	{
		name: "Position top",
		layer: frameLayerType,
		run: () => {
			const get = mount(ActionPosition, "frame", {});
			openPopover("Position");
			fireEvent.change(numericInput("Top"), { target: { value: "10" } });
			return get();
		},
		expected: { top: "10px" },
	},
	{
		name: "AlignItems Center",
		layer: frameLayerType,
		run: () => {
			const get = mount(ActionAlignItems, "frame", FLEX);
			fireEvent.click(screen.getByRole("button", { name: "Center" }));
			return get();
		},
		expected: { "align-items": "center" },
	},
	{
		name: "TextStyle Italic",
		layer: textLayerType,
		run: () => {
			const get = mount(ActionTextStyle, "text", {});
			fireEvent.click(screen.getByRole("button", { name: "Italic" }));
			return get();
		},
		expected: { "font-style": "italic" },
	},
	{
		name: "TextDecoration line",
		layer: textLayerType,
		run: () => {
			const get = mount(ActionTextDecoration, "text", {});
			openPopover("Decoration");
			fireEvent.click(screen.getByRole("button", { name: "Underline" }));
			return get();
		},
		expected: { "text-decoration-line": "underline" },
	},
	{
		name: "TextDecoration style",
		layer: textLayerType,
		run: () => {
			const get = mount(ActionTextDecoration, "text", {});
			openPopover("Decoration");
			fireEvent.click(screen.getByRole("button", { name: "Wavy" }));
			return get();
		},
		expected: { "text-decoration-style": "wavy" },
	},
	{
		name: "TextDecoration thickness",
		layer: textLayerType,
		run: () => {
			const get = mount(ActionTextDecoration, "text", {});
			openPopover("Decoration");
			fireEvent.change(numericInput("Thickness"), { target: { value: "3" } });
			return get();
		},
		expected: { "text-decoration-thickness": "3px" },
	},
	{
		name: "TextShadow blur/offset",
		layer: textLayerType,
		run: () => {
			const get = mount(ActionTextShadow, "text", {});
			openPopover("Shadow");
			fireEvent.change(numericInput("Offset X"), { target: { value: "2" } });
			fireEvent.change(numericInput("Offset Y"), { target: { value: "3" } });
			fireEvent.change(numericInput("Blur"), { target: { value: "4" } });
			return get();
		},
		expected: { "text-shadow": "2px 3px 4px currentcolor" },
	},
];

describe("panel controls write CSS that layers render", () => {
	it.each(cases.map((c) => [c.name, c] as const))(
		"%s",
		async (_name, { run, layer, expected }) => {
			const cssVars = await run();
			cleanup();
			const el = renderLayer(layer, cssVars);
			for (const [prop, value] of Object.entries(expected)) {
				expect(el.style.getPropertyValue(prop)).toBe(value);
			}
		}
	);
});

// --- Table 2: every select/toggle option is valid CSS for its property ----

const VALID: Record<string, string[]> = {
	"--display": [
		"block",
		"inline",
		"inline-block",
		"flex",
		"inline-flex",
		"grid",
		"inline-grid",
		"none",
	],
	"--flex-direction": ["row", "row-reverse", "column", "column-reverse"],
	"--flex-wrap": ["wrap", "nowrap", "wrap-reverse"],
	"--align-items": [
		"normal",
		"stretch",
		"center",
		"start",
		"end",
		"flex-start",
		"flex-end",
		"baseline",
		"first baseline",
		"last baseline",
	],
	"--justify-content": [
		"normal",
		"stretch",
		"center",
		"start",
		"end",
		"flex-start",
		"flex-end",
		"space-between",
		"space-around",
		"space-evenly",
	],
	"--text-align": ["left", "right", "center", "justify", "start", "end"],
	"--text-transform": ["none", "uppercase", "lowercase", "capitalize"],
	"--position": ["static", "relative", "absolute", "fixed", "sticky"],
	"--font-style": ["normal", "italic", "oblique"],
	"--text-decoration-line": ["none", "underline", "overline", "line-through"],
	"--text-decoration-style": ["solid", "double", "dotted", "dashed", "wavy"],
};

const toggleControls: {
	name: string;
	Control: ComponentType;
	layer: string;
	vars: CSSVars;
	cssVar: string;
	open?: string;
	minOptions: number;
}[] = [
	{
		name: "FlexDirection",
		Control: ActionFlexDirection,
		layer: "frame",
		vars: FLEX,
		cssVar: "--flex-direction",
		minOptions: 4,
	},
	{
		name: "FlexWrap",
		Control: ActionFlexWrap,
		layer: "frame",
		vars: FLEX,
		cssVar: "--flex-wrap",
		minOptions: 2,
	},
	{
		name: "AlignItems",
		Control: ActionAlignItems,
		layer: "frame",
		vars: FLEX,
		cssVar: "--align-items",
		minOptions: 5,
	},
	{
		name: "JustifyContent",
		Control: ActionJustifyContent,
		layer: "frame",
		vars: FLEX,
		cssVar: "--justify-content",
		minOptions: 6,
	},
	{
		name: "TextAlign",
		Control: ActionTextAlign,
		layer: "text",
		vars: {},
		cssVar: "--text-align",
		minOptions: 4,
	},
	{
		name: "TextStyle",
		Control: ActionTextStyle,
		layer: "text",
		vars: {},
		cssVar: "--font-style",
		minOptions: 2,
	},
];

describe("every toggle option is valid CSS for the property it writes", () => {
	it.each(toggleControls.map((c) => [c.name, c] as const))("%s", (_name, c) => {
		const values = toggleValues(c.Control, c.layer, c.vars, c.cssVar);
		expect(values.length).toBeGreaterThanOrEqual(c.minOptions);
		for (const v of values) {
			expect(VALID[c.cssVar], `${c.cssVar}: ${v}`).toContain(v);
		}
	});

	it("TextTransform: every option is valid and Normal clears Uppercase", () => {
		const getVars = mount(ActionTextTransform, "text", {});
		fireEvent.click(screen.getByRole("button", { name: "Uppercase" }));
		expect(getVars()["--text-transform"]).toBe("uppercase");
		fireEvent.click(screen.getByRole("button", { name: "Normal" }));
		expect(getVars()["--text-transform"]).toBe("none");
		cleanup();
		const values = toggleValues(
			ActionTextTransform,
			"text",
			{},
			"--text-transform"
		);
		expect(values.length).toBe(4);
		for (const v of values) expect(VALID["--text-transform"]).toContain(v);
	});

	it("Display select", async () => {
		const getVars = mount(ActionDisplay, "frame", {});
		const values: string[] = [];
		const trigger = screen.getAllByRole("combobox")[0];
		await userEvent.click(trigger);
		const names = (await screen.findAllByRole("option")).map(
			(o) => o.textContent
		);
		await userEvent.keyboard("{Escape}");
		for (const name of names) {
			await userEvent.click(screen.getAllByRole("combobox")[0]);
			await userEvent.click(
				await screen.findByRole("option", { name: name ?? "" })
			);
			values.push(getVars()["--display"]);
		}
		expect(values.length).toBe(6);
		for (const v of values) expect(VALID["--display"]).toContain(v);
	});

	it.each(["--text-decoration-line", "--text-decoration-style"])(
		"TextDecoration %s",
		(cssVar) => {
			const getVars = mount(ActionTextDecoration, "text", {});
			openPopover("Decoration");
			const group = screen.getAllByRole("group").find((g) =>
				within(g).queryByRole("button", {
					name: cssVar.endsWith("line") ? "Underline" : "Wavy",
				})
			) as HTMLElement;
			const values: string[] = [];
			for (const button of within(group).getAllByRole("button")) {
				for (let attempt = 0; attempt < 2; attempt++) {
					fireEvent.click(button);
					const v = getVars()[cssVar];
					if (v) {
						values.push(v);
						break;
					}
				}
			}
			// "None"/"Solid" is the pressed default, so clicking it only clears the var.
			expect(values.length).toBe(cssVar.endsWith("line") ? 3 : 4);
			for (const v of values) expect(VALID[cssVar]).toContain(v);
		}
	);
});

describe("no control writes a var that is neither rendered nor internal", () => {
	it.each(cases.map((c) => [c.name, c] as const))("%s", async (_name, c) => {
		const cssVars = await c.run();
		cleanup();
		const supported = c.layer.supportedCssProperties as string[];
		for (const key of Object.keys(cssVars)) {
			// --text-shadow-* are internal parts, combined into --text-shadow
			// by applyCssVars; the layer must list --text-shadow.
			const owner = key.startsWith("--text-shadow-") ? "--text-shadow" : key;
			expect(supported, key).toContain(owner);
		}
	});
});

describe("TextShadow trigger label", () => {
	it("shows none, then the shadow parts, not the decoration", () => {
		const get = mount(ActionTextShadow, "text", {
			"--text-decoration": "underline",
		});
		const label = () =>
			screen.getByText("Shadow").closest("[data-slot=action]")?.textContent;
		expect(label()).toContain("none");
		openPopover("Shadow");
		fireEvent.change(numericInput("Offset X"), { target: { value: "2" } });
		expect(get()["--text-shadow-offset-x"]).toBe("2px");
		expect(label()).toContain("2px 0 0");
		expect(label()).not.toContain("underline");
	});
});

// Every var a control in a panel pane writes. Layer, Layout and Color panes
// show for every layer type; Typography shows for text only.
const PANE_VARS = {
	shared: [
		"--width",
		"--height",
		"--min-width",
		"--max-width",
		"--min-height",
		"--max-height",
		"position",
		"top",
		"right",
		"bottom",
		"left",
		"--opacity",
		"--border-top-left-radius",
		"--border-top-right-radius",
		"--border-bottom-left-radius",
		"--border-bottom-right-radius",
		"--display",
		"--grid-template-columns",
		"--grid-template-rows",
		"--justify-content",
		"--align-items",
		"--flex-direction",
		"--flex-wrap",
		"--row-gap",
		"--column-gap",
		"--padding-block-start",
		"--padding-inline-end",
		"--padding-block-end",
		"--padding-inline-start",
		"--margin-block-start",
		"--margin-inline-end",
		"--margin-block-end",
		"--margin-inline-start",
		"--background-color",
		"--color",
		"--border-color",
		"--border-width",
	],
	text: [
		"--font-family",
		"--font-size",
		"--line-height",
		"--letter-spacing",
		"--text-align",
		"--font-style",
		"--text-decoration-line",
		"--text-decoration-color",
		"--text-decoration-thickness",
		"--text-decoration-style",
		"--text-transform",
		"--text-shadow",
	],
};

describe("every control the panel shows for a layer type renders", () => {
	it.each([
		["frame", frameLayerType, PANE_VARS.shared],
		["text", textLayerType, [...PANE_VARS.shared, ...PANE_VARS.text]],
		["image", imageLayerType, PANE_VARS.shared],
		["input", inputLayerType, PANE_VARS.shared],
	] as const)("%s", (_name, layerType, vars) => {
		for (const v of vars) {
			const supported = layerType.supportedCssProperties as string[];
			expect(supported, `${layerType.type} ${v}`).toContain(v);
			const css = applyCssVars({ [v]: "1" }, layerType.supportedCssProperties);
			expect(Object.keys(css), `${layerType.type} ${v}`).toHaveLength(1);
		}
	});

	it("image renders display, padding, background and border from the panel", () => {
		const el = renderLayer(imageLayerType, {
			"--display": "flex",
			"--padding-block-start": "4px",
			"--background-color": "red",
			"--border-top-left-radius": "3px",
			"--border-color": "blue",
		});
		expect(el.style.display).toBe("flex");
		expect(el.style.paddingBlockStart).toBe("4px");
		expect(el.style.backgroundColor).toBe("red");
		expect(el.style.borderTopLeftRadius).toBe("3px");
		expect(el.style.borderColor).toBe("blue");
	});
});

describe("border", () => {
	const layers: [string, LayerType][] = [
		["frame", frameLayerType],
		["text", textLayerType],
		["image", imageLayerType],
		["input", inputLayerType],
	];
	const BORDER_STYLES = ["none", "solid", "dashed", "dotted", "double"];

	const setWidth = (value: string) => {
		openPopover("Border");
		fireEvent.change(numericInput("Width"), { target: { value } });
	};
	const chooseStyle = async (name: string) => {
		const trigger = screen
			.getAllByRole("combobox")
			.find((c) => BORDER_STYLES.includes(c.textContent ?? ""));
		await userEvent.click(trigger as HTMLElement);
		await userEvent.click(await screen.findByRole("option", { name }));
	};

	it.each(layers)("%s: width alone renders border-style solid", (name, lt) => {
		const get = mount(ActionBorder, name, {});
		setWidth("2");
		const vars = get();
		expect(vars["--border-width"]).toBe("2px");
		expect(vars["--border-style"]).toBe("solid");
		cleanup();
		expect(renderLayer(lt, vars).style.borderStyle).toBe("solid");
	});

	it.each(layers)("%s: dashed renders, none removes", async (name, lt) => {
		const get = mount(ActionBorder, name, { "--border-width": "2px" });
		openPopover("Border");
		await chooseStyle("dashed");
		expect(renderLayer(lt, get()).style.borderStyle).toBe("dashed");
		await chooseStyle("none");
		expect(get()["--border-style"]).toBe("none");
		expect(renderLayer(lt, get()).style.borderStyle).not.toBe("dashed");
	});

	it("every style option is valid CSS", async () => {
		const get = mount(ActionBorder, "frame", { "--border-width": "2px" });
		openPopover("Border");
		await userEvent.click(
			screen
				.getAllByRole("combobox")
				.find((c) => BORDER_STYLES.includes(c.textContent ?? "")) as HTMLElement
		);
		const names = (await screen.findAllByRole("option")).map(
			(o) => o.textContent ?? ""
		);
		await userEvent.keyboard("{Escape}");
		expect(names.length).toBe(5);
		for (const n of names) {
			await chooseStyle(n);
			expect(BORDER_STYLES).toContain(get()["--border-style"]);
		}
	});

	it("a chosen style survives a later width change", async () => {
		const get = mount(ActionBorder, "frame", { "--border-width": "1px" });
		openPopover("Border");
		await chooseStyle("dotted");
		fireEvent.change(numericInput("Width"), { target: { value: "4" } });
		expect(get()["--border-width"]).toBe("4px");
		expect(get()["--border-style"]).toBe("dotted");
	});

	it("emptying the width clears the style", () => {
		const get = mount(ActionBorder, "frame", {});
		setWidth("2");
		fireEvent.change(numericInput("Width"), { target: { value: "" } });
		expect(get()["--border-style"]).toBeUndefined();
	});
});
