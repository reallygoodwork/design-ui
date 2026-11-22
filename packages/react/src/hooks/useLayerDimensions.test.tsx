import { act, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeLayer, renderInDesigner } from "../test/fixtures";
import { useDesignerContext } from "./useDesignerContext";
import { FrameRegistryProvider, useFrameRegistry } from "./useFrameRegistry";
import { useLayerDimensions } from "./useLayerDimensions";

class FakeResizeObserver {
	static instances: FakeResizeObserver[] = [];
	observed: Element[] = [];
	disconnected = false;
	constructor(public callback: () => void) {
		FakeResizeObserver.instances.push(this);
	}
	observe(el: Element) {
		this.observed.push(el);
	}
	unobserve() {}
	disconnect() {
		this.disconnected = true;
	}
}

const layer = makeLayer("a");
let ctx: ReturnType<typeof useDesignerContext>;
let result: { width: number; height: number } | null;

const Frames = () => {
	ctx = useDesignerContext();
	result = useLayerDimensions(layer);
	const registry = useFrameRegistry();
	return (
		<>
			{["mobile", "tablet"].map((bp) => (
				<div
					key={bp}
					className="designer-frame breakpoint-frame"
					data-breakpoint-id={bp}
					ref={(frame) => {
						if (frame) {
							registry.register(bp, frame);
						}
					}}
				>
					<div
						className="designer-layer"
						data-layer-id="a"
						data-breakpoint-id={bp}
					/>
				</div>
			))}
		</>
	);
};

const Probe = () => (
	<FrameRegistryProvider>
		<Frames />
	</FrameRegistryProvider>
);

const el = (bp: string) =>
	document.querySelector(
		`.breakpoint-frame[data-breakpoint-id="${bp}"] .designer-layer`
	) as HTMLElement;

// Stub sizes on prototype-free elements before the effect runs by patching
// the prototype getters keyed on breakpoint.
const sizes: Record<string, [number, number]> = {
	mobile: [100, 50],
	tablet: [300, 200],
};

beforeEach(() => {
	FakeResizeObserver.instances = [];
	vi.stubGlobal("ResizeObserver", FakeResizeObserver);
	for (const prop of ["offsetWidth", "offsetHeight"] as const) {
		Object.defineProperty(HTMLElement.prototype, prop, {
			configurable: true,
			get(this: HTMLElement) {
				const bp = this.getAttribute("data-breakpoint-id");
				if (!(bp && this.classList.contains("designer-layer"))) return 0;
				// Mimic zoom: unzoomed offset size is unaffected by it.
				return sizes[bp][prop === "offsetWidth" ? 0 : 1];
			},
		});
	}
	// Zoomed rects, to catch implementations that use getBoundingClientRect.
	vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
		function (this: HTMLElement) {
			const bp = this.getAttribute("data-breakpoint-id") ?? "mobile";
			return {
				width: sizes[bp][0] * 2,
				height: sizes[bp][1] * 2,
			} as DOMRect;
		}
	);
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	// biome-ignore lint/performance/noDelete: restore jsdom default
	delete (HTMLElement.prototype as unknown as Record<string, unknown>)
		.offsetWidth;
	// biome-ignore lint/performance/noDelete: restore jsdom default
	delete (HTMLElement.prototype as unknown as Record<string, unknown>)
		.offsetHeight;
});

describe("useLayerDimensions", () => {
	it("measures the active breakpoint's element, not the first frame", () => {
		renderInDesigner(<Probe />, { layers: [layer] });
		act(() => {
			ctx.dispatch({
				type: "SET_ACTIVE_BREAKPOINT",
				payload: { breakpointId: "tablet" },
			});
		});
		expect(result).toEqual({ width: 300, height: 200 });
	});

	it("reports unzoomed pixels at zoom 2", () => {
		renderInDesigner(<Probe />, { layers: [layer] });
		act(() => {
			ctx.dispatch({
				type: "SET_ACTIVE_BREAKPOINT",
				payload: { breakpointId: "tablet" },
			});
			ctx.dispatch({ type: "SET_ZOOM", payload: 2 });
		});
		expect(result).toEqual({ width: 300, height: 200 });
	});

	it("updates when the observer fires", () => {
		renderInDesigner(<Probe />, { layers: [layer] });
		act(() => {
			ctx.dispatch({
				type: "SET_ACTIVE_BREAKPOINT",
				payload: { breakpointId: "tablet" },
			});
		});
		sizes.tablet = [320, 210];
		const ro = FakeResizeObserver.instances.at(-1);
		act(() => ro?.callback());
		expect(result).toEqual({ width: 320, height: 210 });
		sizes.tablet = [300, 200];
	});

	it("re-measures when the active breakpoint changes", () => {
		renderInDesigner(<Probe />, { layers: [layer] });
		act(() => {
			ctx.dispatch({
				type: "SET_ACTIVE_BREAKPOINT",
				payload: { breakpointId: "mobile" },
			});
		});
		expect(result).toEqual({ width: 100, height: 50 });
		act(() => {
			ctx.dispatch({
				type: "SET_ACTIVE_BREAKPOINT",
				payload: { breakpointId: "tablet" },
			});
		});
		expect(result).toEqual({ width: 300, height: 200 });
		expect(FakeResizeObserver.instances.at(-1)?.observed[0]).toBe(el("tablet"));
	});

	it("disconnects the observer on unmount", () => {
		const { unmount } = renderInDesigner(<Probe />, { layers: [layer] });
		const ros = FakeResizeObserver.instances;
		expect(ros.length).toBeGreaterThan(0);
		unmount();
		expect(ros.every((r) => r.disconnected)).toBe(true);
	});
});
