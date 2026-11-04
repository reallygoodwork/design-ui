import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import structureAbleSource from "../components/ables/StructureAble.tsx?raw";
import breakpointFrameSource from "../components/BreakpointFrame.tsx?raw";
import canvasSource from "../components/DesignerCanvas.tsx?raw";
import {
	createFrameRegistry,
	type FrameRegistry,
	FrameRegistryProvider,
	useFrameRegistry,
} from "./useFrameRegistry";
import layerDimensionsSource from "./useLayerDimensions.ts?raw";

const makeRoot = (bpId: string, layerIds: string[]) => {
	const frame = document.createElement("div");
	frame.className = "breakpoint-frame";
	frame.setAttribute("data-breakpoint-id", bpId);
	const root = document.createElement("div");
	root.className = "breakpoint-content";
	for (const id of layerIds) {
		const layer = document.createElement("div");
		layer.className = "designer-layer";
		layer.setAttribute("data-layer-id", id);
		layer.setAttribute("data-breakpoint-id", bpId);
		root.appendChild(layer);
	}
	frame.appendChild(root);
	document.body.appendChild(frame);
	return { frame, root };
};

afterEach(() => {
	document.body.innerHTML = "";
	(document as { elementsFromPoint?: unknown }).elementsFromPoint = undefined;
});

describe("createFrameRegistry", () => {
	it("registers, returns and unregisters frame roots", () => {
		const reg = createFrameRegistry();
		const { root } = makeRoot("mobile", ["a"]);
		expect(reg.getFrameRoot("mobile")).toBeNull();
		reg.register("mobile", root);
		expect(reg.getFrameRoot("mobile")).toBe(root);
		reg.unregister("mobile", root);
		expect(reg.getFrameRoot("mobile")).toBeNull();
	});

	it("does not unregister a different element for the same id", () => {
		const reg = createFrameRegistry();
		const a = makeRoot("mobile", []);
		const b = makeRoot("mobile", []);
		reg.register("mobile", a.root);
		reg.register("mobile", b.root);
		reg.unregister("mobile", a.root);
		expect(reg.getFrameRoot("mobile")).toBe(b.root);
	});

	it("queryLayer finds the right breakpoint's element", () => {
		const reg = createFrameRegistry();
		const m = makeRoot("mobile", ["a"]);
		const t = makeRoot("tablet", ["a", "b"]);
		reg.register("mobile", m.root);
		reg.register("tablet", t.root);
		expect(reg.queryLayer("tablet", "a")).toBe(t.root.children[0]);
		expect(reg.queryLayer("mobile", "a")).toBe(m.root.children[0]);
		expect(reg.queryLayer("mobile", "b")).toBeNull();
		expect(reg.queryLayer("nope", "zzz")).toBeNull();
	});

	it("queryLayer without a breakpoint searches the registered frames", () => {
		const reg = createFrameRegistry();
		const m = makeRoot("mobile", ["a"]);
		const t = makeRoot("tablet", ["b"]);
		reg.register("mobile", m.root);
		reg.register("tablet", t.root);
		expect(reg.queryLayer(null, "a")).toBe(m.root.children[0]);
		expect(reg.queryLayer(null, "b")).toBe(t.root.children[0]);
	});

	it("getAllLayerElements returns layers of every frame", () => {
		const reg = createFrameRegistry();
		const m = makeRoot("mobile", ["a"]);
		const t = makeRoot("tablet", ["b"]);
		reg.register("mobile", m.root);
		reg.register("tablet", t.root);
		expect(reg.getAllLayerElements()).toEqual([
			m.root.children[0],
			t.root.children[0],
		]);
	});

	it("layersAtPoint returns shallowest-first ids and the breakpoint", () => {
		const reg = createFrameRegistry();
		const t = makeRoot("tablet", ["outer"]);
		const inner = document.createElement("div");
		inner.className = "designer-layer";
		inner.setAttribute("data-layer-id", "inner");
		t.root.children[0].appendChild(inner);
		reg.register("tablet", t.root);
		// elementsFromPoint is front-to-back: deepest first
		document.elementsFromPoint = () => [inner, t.root.children[0], t.root];
		expect(reg.layersAtPoint(1, 2)).toEqual({
			layerIds: ["outer", "inner"],
			breakpointId: "tablet",
		});
	});

	it("layersAtPoint with nothing registered or hit returns empty", () => {
		const reg = createFrameRegistry();
		expect(reg.layersAtPoint(0, 0)).toEqual({
			layerIds: [],
			breakpointId: null,
		});
		makeRoot("mobile", []);
		reg.register("mobile", document.createElement("div"));
		document.elementsFromPoint = () => [];
		expect(reg.layersAtPoint(0, 0)).toEqual({
			layerIds: [],
			breakpointId: null,
		});
	});
});

const seen: FrameRegistry[] = [];
const Probe = () => {
	seen.push(useFrameRegistry());
	return null;
};

describe("FrameRegistryProvider", () => {
	it("gives consumers one registry per provider", () => {
		seen.length = 0;
		render(
			<>
				<FrameRegistryProvider>
					<Probe />
					<Probe />
				</FrameRegistryProvider>
				<FrameRegistryProvider>
					<Probe />
				</FrameRegistryProvider>
			</>
		);
		expect(seen[0]).toBe(seen[1]);
		expect(seen[2]).not.toBe(seen[0]);
	});

	it("falls back to an empty registry without a provider", () => {
		seen.length = 0;
		render(<Probe />);
		const reg = seen[0];
		expect(reg?.getFrameRoot("x")).toBeNull();
		expect(reg?.layersAtPoint(0, 0).layerIds).toEqual([]);
	});
});

describe("design-DOM queries go through the registry", () => {
	it("no document-level design queries outside the registry", () => {
		for (const src of [
			canvasSource,
			layerDimensionsSource,
			breakpointFrameSource,
		]) {
			expect(src).not.toMatch(/document\.(querySelector|elementsFromPoint)/);
		}
	});

	it("StructureAble does not use instanceof HTMLElement", () => {
		expect(structureAbleSource).not.toContain("instanceof HTMLElement");
	});
});
