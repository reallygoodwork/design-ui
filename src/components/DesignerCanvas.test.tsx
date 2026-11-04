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

vi.mock("react-moveable", async () => {
	const React = await import("react");
	return {
		default: React.forwardRef((props: Record<string, unknown>, ref) => {
			React.useImperativeHandle(ref, () => ({ updateRect }));
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
		layer.className = "designer-layer";
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

	it("gives Moveable zoom === 1 / state.zoom", () => {
		setZoom(2);
		expect(moveableProps.current?.zoom).toBe(0.5);
		setZoom(0.5);
		expect(moveableProps.current?.zoom).toBe(2);
	});

	it("passes viewerZoom to the ables and no custom zoom key", () => {
		setZoom(2);
		const props = moveableProps.current?.props as Record<string, unknown>;
		expect(props.viewerZoom).toBe(2);
		expect(props).not.toHaveProperty("zoom");
	});

	it("has no dead getElement() inverse-scale effect left", () => {
		expect(canvasSource).not.toContain("inverseScale");
		expect(canvasSource).not.toMatch(
			/querySelectorAll\(\s*"\.moveable-control-box"/
		);
	});

	it("DimensionAble shows the unzoomed size, counter-scaled", () => {
		const renderLabel = (viewerZoom: number) => {
			const el = DimensionAble.render(
				{
					getRect: () => ({ height: 100, offsetWidth: 120, offsetHeight: 80 }),
					props: { viewerZoom },
				} as never,
				{} as never
			);
			return render(el as ReactElement).container;
		};
		const at2 = renderLabel(2);
		expect(at2.textContent).toBe("120 x 80");
		expect(
			(at2.querySelector(".moveable-dimension") as HTMLElement).style.transform
		).toBe("scale(0.5)");
		cleanup();
		const at05 = renderLabel(0.5);
		expect(at05.textContent).toBe("120 x 80");
		expect(
			(at05.querySelector(".moveable-dimension") as HTMLElement).style.transform
		).toBe("scale(2)");
	});
});
