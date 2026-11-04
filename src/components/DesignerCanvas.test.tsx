import { act, cleanup, render } from "@testing-library/react";
import { type ReactElement, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { breakpoints, makeLayer, renderInDesigner } from "../test/fixtures";
import { DimensionAble } from "./ables/DimensionAble";
import { BreakpointHeader } from "./BreakpointHeader";
import { DesignerCanvas } from "./DesignerCanvas";
import canvasSource from "./DesignerCanvas.tsx?raw";

const moveableProps = vi.hoisted(() => ({
	current: null as Record<string, unknown> | null,
}));
const selectoProps = vi.hoisted(() => ({
	current: null as Record<string, unknown> | null,
}));
const updateRect = vi.hoisted(() => vi.fn());
const controlBox = vi.hoisted(() => ({ current: null as HTMLElement | null }));

vi.mock("react-moveable", async () => {
	const React = await import("react");
	return {
		default: React.forwardRef((props: Record<string, unknown>, ref) => {
			React.useImperativeHandle(ref, () => ({
				updateRect,
				getControlBoxElement: () => controlBox.current,
			}));
			moveableProps.current = props;
			return null;
		}),
	};
});

vi.mock("react-selecto", async () => {
	const React = await import("react");
	return {
		default: React.forwardRef((props: Record<string, unknown>) => {
			selectoProps.current = props;
			return null;
		}),
	};
});

vi.mock("react-infinite-viewer", async () => {
	const React = await import("react");
	return {
		default: React.forwardRef(
			({ children }: { children?: React.ReactNode }, _ref) => (
				<div>{children}</div>
			)
		),
	};
});

describe("drag disabled", () => {
	it("passes draggable false and no onDrag to Moveable", () => {
		renderInDesigner(
			<DesignerCanvas>
				<div />
			</DesignerCanvas>,
			{ layers: [makeLayer("a")] }
		);
		const props = moveableProps.current;
		expect(props).not.toBeNull();
		expect(props?.draggable).toBe(false);
		expect(props).not.toHaveProperty("onDrag");
	});

	it("keeps the custom ables and their props", () => {
		renderInDesigner(
			<DesignerCanvas>
				<div />
			</DesignerCanvas>
		);
		const props = moveableProps.current;
		expect(props?.ables).toHaveLength(2);
		expect(props?.props).toMatchObject({
			dimensionViewable: true,
			structureViewable: true,
		});
	});
});

type Dispatch = ReturnType<typeof useDesignerAction>;
let dispatch: Dispatch;
const Probe = () => {
	const action = useDesignerAction();
	useEffect(() => {
		dispatch = action;
	}, [action]);
	return null;
};

describe("outline follows frame", () => {
	beforeEach(() => {
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			cb(0);
			return 0;
		});
		updateRect.mockClear();
		renderInDesigner(
			<DesignerCanvas>
				<Probe />
			</DesignerCanvas>,
			{ layers: [makeLayer("a")] }
		);
		act(() => {
			dispatch({
				type: "SELECT_LAYER",
				payload: { layerId: "a", shiftKey: false, breakpointId: "tablet" },
			});
		});
		updateRect.mockClear();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("calls updateRect when a breakpoint moves", () => {
		act(() => {
			dispatch({
				type: "UPDATE_BREAKPOINT",
				payload: { id: "tablet", updates: { position: { x: 900, y: 50 } } },
			});
		});
		expect(updateRect).toHaveBeenCalledTimes(1);
	});

	it("does not call updateRect for unrelated actions", () => {
		act(() => {
			dispatch({
				type: "OPEN_ADD_LAYER_DIALOG",
				payload: { layerId: "a", position: "inside" },
			});
		});
		act(() => {
			dispatch({ type: "CLOSE_ADD_LAYER_DIALOG" });
		});
		expect(updateRect).not.toHaveBeenCalled();
	});
});

describe("header drag", () => {
	const getCondition = () =>
		selectoProps.current?.dragCondition as
			| ((e: { inputEvent?: { target: EventTarget | null } }) => boolean)
			| undefined;

	it("dragCondition rejects header targets and accepts layer targets", () => {
		const { container } = renderInDesigner(
			<DesignerCanvas>{null}</DesignerCanvas>,
			{
				layers: [makeLayer("a")],
			}
		);
		const condition = getCondition();
		expect(condition).toBeTypeOf("function");

		const header = document.createElement("div");
		header.setAttribute("data-breakpoint-header", "");
		const inner = document.createElement("button");
		header.appendChild(inner);
		container.appendChild(header);
		const layer = document.createElement("div");
		layer.className = "designer-layer moveable-dimension";
		const layerChild = document.createElement("span");
		layer.appendChild(layerChild);
		container.appendChild(layer);

		expect(condition?.({ inputEvent: { target: inner } })).toBe(false);
		expect(condition?.({ inputEvent: { target: layerChild } })).toBe(true);
		expect(condition?.({})).toBe(true);
	});

	it("BreakpointHeader renders the marker", () => {
		const { container } = renderInDesigner(
			<BreakpointHeader
				breakpoint={breakpoints[0]}
				isActive={false}
				isSelected={false}
			/>
		);
		expect(
			container.querySelector(".breakpoint-header[data-breakpoint-header]")
		).not.toBeNull();
	});
});

describe("zoom", () => {
	const setZoom = (zoom: number) =>
		act(() => {
			dispatch({ type: "SET_ZOOM", payload: zoom });
		});

	beforeEach(() => {
		renderInDesigner(
			<DesignerCanvas>
				<Probe />
			</DesignerCanvas>,
			{ layers: [makeLayer("a")] }
		);
	});

	it("does not override Moveable's own zoom at any canvas zoom", () => {
		for (const z of [0.5, 1, 2]) {
			setZoom(z);
			const mz = moveableProps.current?.zoom;
			expect(mz === undefined || mz === 1).toBe(true);
		}
	});

	it("passes viewerZoom to the ables and no custom zoom key", () => {
		setZoom(2);
		const props = moveableProps.current?.props as Record<string, unknown>;
		expect(props.viewerZoom).toBe(2);
		expect(props).not.toHaveProperty("zoom");
	});

	it("has no dead getElement() inverse-scale effect left", () => {
		expect(canvasSource).not.toContain("inverseScale");
		expect(canvasSource).not.toMatch(/moveableRef\.current\??\.getElement/);
		expect(canvasSource).not.toMatch(
			/querySelectorAll\(\s*"\.moveable-control-box"/
		);
	});

	it("DimensionAble shows the unzoomed size with no zoom-dependent transform", () => {
		for (const viewerZoom of [0.5, 1, 2]) {
			const el = DimensionAble.render(
				{
					getRect: () => ({ height: 100, offsetWidth: 120, offsetHeight: 80 }),
					props: { viewerZoom },
				} as never,
				{} as never
			);
			const { container } = render(el as ReactElement);
			const label = container.querySelector(
				".moveable-dimension"
			) as HTMLElement;
			expect(container.textContent).toBe("120 x 80");
			expect(label.style.transform).toBe("");
			cleanup();
		}
	});
});

describe("moveable control clicks", () => {
	const selectEnd = (target: Element) =>
		act(() => {
			const onSelectEnd = selectoProps.current?.onSelectEnd as (
				e: unknown
			) => void;
			onSelectEnd({
				inputEvent: { target, clientX: 5, clientY: 5, shiftKey: false },
				isClick: true,
				selected: [],
			});
		});
	const targets = () => moveableProps.current?.target as unknown[] | undefined;

	let box: HTMLElement;
	let handle: HTMLElement;
	let layer: HTMLElement;
	beforeEach(() => {
		const { container } = renderInDesigner(
			<DesignerCanvas>
				<Probe />
			</DesignerCanvas>,
			{ layers: [makeLayer("a")] }
		);
		box = document.createElement("div");
		handle = document.createElement("span");
		box.appendChild(handle);
		layer = document.createElement("div");
		layer.className = "designer-layer moveable-dimension";
		container.append(box, layer);
		controlBox.current = box;
		act(() => {
			dispatch({
				type: "SELECT_LAYER",
				payload: { layerId: "a", shiftKey: false, breakpointId: "tablet" },
			});
		});
	});

	afterEach(() => {
		(document as { elementsFromPoint?: unknown }).elementsFromPoint = undefined;
		controlBox.current = null;
	});

	it("ignores a click inside the control box (no DESELECT_ALL)", () => {
		selectEnd(handle);
		expect(targets()?.length).toBe(1);
	});

	it("does not ignore a click on a design layer", () => {
		document.elementsFromPoint = () => [];
		selectEnd(layer);
		expect(targets()?.length ?? 0).toBe(0);
	});
});
