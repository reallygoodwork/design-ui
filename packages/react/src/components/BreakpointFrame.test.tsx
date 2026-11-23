import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DesignerProvider } from "../context/DesignerContext";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { CURSOR_SELECT_BY_TYPE } from "../lib/cursors";
import { inputLayerType } from "../lib/layers/input";
import { textLayerType } from "../lib/layers/text";
import {
	breakpoints,
	defaultLayerTypes,
	makeLayer,
	renderInDesigner,
} from "../test/fixtures";
import { BreakpointFrame } from "./BreakpointFrame";

type Dispatch = ReturnType<typeof useDesignerContext>["dispatch"];

const Frames = ({ onDispatch }: { onDispatch?: (d: Dispatch) => void }) => {
	const { dispatch } = useDesignerContext();
	onDispatch?.(dispatch);
	return (
		<>
			{breakpoints.map((bp) => (
				<BreakpointFrame
					key={bp.id}
					breakpoint={bp}
					isActive={false}
					isSelected={false}
				/>
			))}
		</>
	);
};

/** A frame's content root, inside its shadow root. */
const frameRoot = (container: HTMLElement, bp: string) =>
	container
		.querySelector(
			`.breakpoint-frame[data-breakpoint-id="${bp}"] .breakpoint-content`
		)
		?.shadowRoot?.querySelector('[data-slot="designer-frame"]') as HTMLElement;

const find = (container: HTMLElement, bp: string, id: string) =>
	frameRoot(container, bp).querySelector(
		`[data-layer-id="${id}"]`
	) as HTMLElement;

const textLayer = makeLayer("t", undefined, {
	type: "text",
	value: "Hello",
	elementType: "p",
	cssVars: { "--font-size": "16px" },
	breakpointCssVars: { tablet: { "--font-size": "24px" } },
});

const fontSize = (container: HTMLElement, bp: string, id: string) =>
	(find(container, bp, id).firstElementChild as HTMLElement).style.fontSize;

describe("breakpoint overrides", () => {
	it("renders base on mobile and the override on tablet", () => {
		const { container } = renderInDesigner(<Frames />, { layers: [textLayer] });
		expect(fontSize(container, "mobile", "t")).toBe("16px");
		expect(fontSize(container, "tablet", "t")).toBe("24px");
	});

	it("desktop inherits the tablet override", () => {
		const { container } = renderInDesigner(<Frames />, { layers: [textLayer] });
		expect(fontSize(container, "desktop", "t")).toBe("24px");
	});

	it("clearing the tablet override restores 16px", () => {
		let dispatch: Dispatch | undefined;
		const { container } = renderInDesigner(
			<Frames onDispatch={(d) => (dispatch = d)} />,
			{ layers: [textLayer] }
		);
		expect(fontSize(container, "tablet", "t")).toBe("24px");
		act(() => {
			dispatch?.({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: "t",
					css: { "--font-size": "" },
					breakpointId: "tablet",
				},
			});
		});
		expect(fontSize(container, "tablet", "t")).toBe("16px");
		expect(fontSize(container, "desktop", "t")).toBe("16px");
	});

	it("applies overrides to non-text layers (image --width)", () => {
		const image = makeLayer("i", undefined, {
			type: "image",
			value: "x.png",
			cssVars: { "--width": "100px" },
			breakpointCssVars: { tablet: { "--width": "300px" } },
		});
		const { container } = renderInDesigner(<Frames />, { layers: [image] });
		const width = (bp: string) =>
			(find(container, bp, "i").querySelector("img") as HTMLElement).style
				.width;
		expect(width("mobile")).toBe("100px");
		expect(width("tablet")).toBe("300px");
		expect(width("desktop")).toBe("300px");
	});
});

describe("frame styles", () => {
	const frameStyles = {
		"--font-family": "Georgia",
		"--color": "#ff0000",
		"--background-color": "#eeeeee",
	};
	const plain = makeLayer("plain", undefined, {
		type: "text",
		value: "Plain",
		elementType: "p",
		cssVars: { "--font-size": "16px" },
	});
	const explicit = makeLayer("explicit", undefined, {
		type: "text",
		value: "Explicit",
		elementType: "p",
		cssVars: { "--font-family": "Courier", "--color": "#0000ff" },
	});
	const renderWithFrame = () =>
		render(
			<DesignerProvider
				defaultLayers={[plain, explicit]}
				defaultLayerTypes={defaultLayerTypes}
				breakpoints={breakpoints}
				frameStyles={frameStyles}
			>
				<Frames />
			</DesignerProvider>
		);
	const root = frameRoot;

	it("applies frame styles as real properties on every frame root", () => {
		const { container } = renderWithFrame();
		for (const bp of ["mobile", "tablet", "desktop"]) {
			const el = root(container, bp);
			expect(el.style.fontFamily).toBe("Georgia");
			expect(el.style.color).toBe("rgb(255, 0, 0)");
			expect(el.style.backgroundColor).toBe("rgb(238, 238, 238)");
		}
	});

	it("keeps the white background fallback", () => {
		const { container } = renderInDesigner(<Frames />);
		expect(root(container, "mobile").style.backgroundColor).toBe(
			"rgb(255, 255, 255)"
		);
	});

	it("text without explicit values inherits; explicit values are kept", () => {
		const { container } = renderWithFrame();
		for (const bp of ["mobile", "tablet", "desktop"]) {
			const p = find(container, bp, "plain").firstElementChild as HTMLElement;
			expect(p.style.fontFamily).toBe("");
			expect(p.style.color).toBe("");
			const e = find(container, bp, "explicit")
				.firstElementChild as HTMLElement;
			expect(e.style.fontFamily).toBe("Courier");
			expect(e.style.color).toBe("rgb(0, 0, 255)");
		}
	});

	it("new text layers do not hard-code a font family", () => {
		const vars = textLayerType.defaultValues.cssVars as Record<string, string>;
		expect(vars["--font-family"]).toBeUndefined();
	});
});

const Selected = () => {
	const { state } = useDesignerContext();
	return <output data-testid="sel">{state.selectedBreakpointId ?? ""}</output>;
};

describe("frame root", () => {
	const nested = makeLayer("outer", undefined, {
		type: "frame",
		children: [
			makeLayer("inner", undefined, {
				type: "text",
				value: "Hi",
				elementType: "p",
			}),
		],
	});
	const content = (c: HTMLElement, bp: string) =>
		c.querySelector(
			`.breakpoint-frame[data-breakpoint-id="${bp}"] .breakpoint-content`
		) as HTMLElement;
	const contentRoot = frameRoot;

	it(".breakpoint-content is a DIV", () => {
		const { container } = renderInDesigner(<Frames />);
		expect(content(container, "mobile").tagName).toBe("DIV");
	});

	it("logs no DOM nesting error for nested block layers", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const input = makeLayer("in", undefined, { type: "input", value: "x" });
		const { container } = render(
			<DesignerProvider
				defaultLayers={[nested, input]}
				defaultLayerTypes={[...defaultLayerTypes, inputLayerType]}
				breakpoints={breakpoints}
			>
				<Frames />
			</DesignerProvider>
		);
		const layerEls = ["mobile", "tablet", "desktop"].flatMap((bp) => [
			...frameRoot(container, bp).querySelectorAll(".designer-layer"),
		]);
		expect(layerEls.length).toBeGreaterThan(0);
		for (const el of layerEls) {
			expect(el.closest("button")).toBeNull();
		}
		const bad = spy.mock.calls
			.map((a) => a.map(String).join(" "))
			.filter(
				(m) =>
					m.includes("validateDOMNesting") ||
					/cannot be a (descendant|child) of/.test(m)
			);
		spy.mockRestore();
		expect(bad).toEqual([]);
	});

	it("selects the breakpoint on empty space click, not on layer click", () => {
		const { container, getByTestId } = renderInDesigner(
			<>
				<Frames />
				<Selected />
			</>,
			{ layers: [nested] }
		);
		const before = getByTestId("sel").textContent;
		fireEvent.click(find(container, "tablet", "inner"));
		expect(getByTestId("sel").textContent).toBe(before);
		fireEvent.click(contentRoot(container, "tablet"));
		expect(getByTestId("sel").textContent).toBe("tablet");
	});
});

describe("default colour", () => {
	const plain = makeLayer("plain", undefined, {
		type: "text",
		value: "Plain",
		elementType: "p",
		cssVars: { "--font-size": "16px" },
	});
	const explicit = makeLayer("explicit", undefined, {
		type: "text",
		value: "Explicit",
		elementType: "p",
		cssVars: { "--color": "#0000ff" },
	});
	const root = frameRoot;
	const inner = (c: HTMLElement, bp: string, id: string) =>
		find(c, bp, id).firstElementChild as HTMLElement;

	it("defaults every frame root to black and leaves plain text uncoloured", () => {
		const { container } = renderInDesigner(<Frames />, {
			layers: [plain],
		});
		for (const bp of ["mobile", "tablet", "desktop"]) {
			expect(root(container, bp).style.color).toBe("rgb(0, 0, 0)");
			expect(inner(container, bp, "plain").style.color).toBe("");
		}
	});

	it("uses the frame --color when set", () => {
		const { container } = render(
			<DesignerProvider
				defaultLayers={[plain]}
				defaultLayerTypes={defaultLayerTypes}
				breakpoints={breakpoints}
				frameStyles={{ "--color": "#ff0000" }}
			>
				<Frames />
			</DesignerProvider>
		);
		for (const bp of ["mobile", "tablet", "desktop"]) {
			expect(root(container, bp).style.color).toBe("rgb(255, 0, 0)");
			expect(inner(container, bp, "plain").style.color).toBe("");
		}
	});

	it("keeps an explicit layer colour", () => {
		const { container } = renderInDesigner(<Frames />, {
			layers: [explicit],
		});
		expect(inner(container, "mobile", "explicit").style.color).toBe(
			"rgb(0, 0, 255)"
		);
	});

	it("text layer defaults have no --color", () => {
		const vars = textLayerType.defaultValues.cssVars as Record<string, string>;
		expect(vars["--color"]).toBeUndefined();
	});
});

describe("layout", () => {
	it("renders display, flex-direction and gap as inline styles on a frame", () => {
		const frame = makeLayer("f", undefined, {
			cssVars: {
				"--display": "flex",
				"--flex-direction": "column",
				"--column-gap": "12px",
			},
		});
		const { container } = renderInDesigner(<Frames />, { layers: [frame] });
		for (const bp of ["mobile", "tablet", "desktop"]) {
			const el = find(container, bp, "f").firstElementChild as HTMLElement;
			expect(el.style.display).toBe("flex");
			expect(el.style.flexDirection).toBe("column");
			expect(el.style.columnGap).toBe("12px");
		}
	});

	it("children are direct children of the parent layer's rendered element", () => {
		const frame = makeLayer(
			"p",
			[makeLayer("a"), makeLayer("b", [makeLayer("c"), makeLayer("d")])],
			{ cssVars: { "--display": "flex", "--column-gap": "12px" } }
		);
		const { container } = renderInDesigner(<Frames />, { layers: [frame] });
		for (const bp of ["mobile", "tablet", "desktop"]) {
			const parent = find(container, bp, "p").firstElementChild as HTMLElement;
			expect(parent.style.display).toBe("flex");
			expect(find(container, bp, "a").parentElement).toBe(parent);
			expect(find(container, bp, "b").parentElement).toBe(parent);
			const b = find(container, bp, "b").firstElementChild as HTMLElement;
			expect(find(container, bp, "c").parentElement).toBe(b);
			expect(find(container, bp, "d").parentElement).toBe(b);
		}
	});
});

describe("style isolation", () => {
	const host = (c: HTMLElement, bp: string) =>
		c.querySelector(
			`.breakpoint-frame[data-breakpoint-id="${bp}"] .breakpoint-content`
		) as HTMLElement;

	it("renders design content in an open shadow root, not the page", () => {
		const { container } = renderInDesigner(<Frames />, {
			layers: [makeLayer("a")],
		});
		for (const bp of ["mobile", "tablet", "desktop"]) {
			expect(host(container, bp).shadowRoot).not.toBeNull();
			expect(host(container, bp).querySelector(".designer-layer")).toBeNull();
			expect(find(container, bp, "a")).not.toBeNull();
		}
	});

	it("resets the host so editor and page styles don't reach the design", () => {
		const { container } = renderInDesigner(<Frames />, {
			layers: [makeLayer("a")],
		});
		const css = host(container, "mobile").shadowRoot?.querySelector(
			"style"
		)?.textContent;
		expect(css).toContain(":host{all:initial");
	});
});

describe("canvas cursors", () => {
	const styleText = (container: HTMLElement) =>
		frameRoot(container, "mobile").getRootNode() instanceof ShadowRoot
			? ((
					frameRoot(container, "mobile").getRootNode() as ShadowRoot
				).querySelector("style")?.textContent ?? "")
			: "";

	it("tags each layer with its type and lock, for the cursor to read", () => {
		const locked = makeLayer("l", undefined, { type: "frame", isLocked: true });
		const { container } = renderInDesigner(<Frames />, {
			layers: [textLayer, locked],
		});
		expect(find(container, "mobile", "t").dataset.layerType).toBe("text");
		expect(find(container, "mobile", "t").hasAttribute("data-locked")).toBe(
			false
		);
		expect(find(container, "mobile", "l").hasAttribute("data-locked")).toBe(
			true
		);
	});

	it("gives every built-in type its own select cursor, and locked layers inherit", () => {
		const { container } = renderInDesigner(<Frames />, {
			layers: [textLayer],
		});
		const css = styleText(container);
		for (const [type, cursor] of Object.entries(CURSOR_SELECT_BY_TYPE)) {
			expect(css).toContain(
				`.designer-layer[data-layer-type="${type}"]{cursor:${cursor}!important}`
			);
		}
		expect(new Set(Object.values(CURSOR_SELECT_BY_TYPE)).size).toBe(4);
		// The locked rule comes last, so it wins over the type rules
		expect(
			css
				.trimEnd()
				.endsWith(".designer-layer[data-locked]{cursor:inherit!important}")
		).toBe(true);
	});
});
