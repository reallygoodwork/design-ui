import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DesignerProvider } from "../context/DesignerContext";
import { useDesignerContext } from "../hooks/useDesignerContext";
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

const find = (container: HTMLElement, bp: string, id: string) =>
	container.querySelector(
		`.breakpoint-frame[data-breakpoint-id="${bp}"] [data-layer-id="${id}"]`
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
	const root = (c: HTMLElement, bp: string) =>
		c.querySelector(
			`.breakpoint-frame[data-breakpoint-id="${bp}"] .breakpoint-content`
		) as HTMLElement;

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

	it(".breakpoint-content is a DIV", () => {
		const { container } = renderInDesigner(<Frames />);
		expect(content(container, "mobile").tagName).toBe("DIV");
	});

	it("logs no DOM nesting error for nested block layers", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
		renderInDesigner(<Frames />, { layers: [nested] });
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
		fireEvent.click(content(container, "tablet"));
		expect(getByTestId("sel").textContent).toBe("tablet");
	});
});
