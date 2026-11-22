import { initialState, reducer, withLayers } from "@design-ui/core";
import { describe, expect, it } from "vitest";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { useLayers } from "../hooks/useLayers";
import {
	breakpoints,
	defaultLayerTypes,
	makeLayer,
	renderInDesigner,
} from "./fixtures";

const LayerIds = () => (
	<p>
		{useLayers()
			.map((l) => l.id)
			.join(",")}
	</p>
);

const DesignerSummary = () => {
	const { state } = useDesignerContext();
	return (
		<p>
			{state.breakpoints.map((bp) => bp.id).join(",")}|
			{state.layerTypes.map((lt) => lt.type).join(",")}
		</p>
	);
};

describe("test infrastructure", () => {
	it("runs the reducer against fixture layers", () => {
		const state = reducer(withLayers(initialState, [makeLayer("A")]), {
			type: "DESELECT_ALL",
		});
		expect(state.layers.map((l) => l.id)).toEqual(["A"]);
	});

	it("renders UI inside a DesignerProvider with fixture layers", () => {
		const { getByText } = renderInDesigner(<LayerIds />, {
			layers: [makeLayer("A", [makeLayer("a1")]), makeLayer("B")],
		});
		expect(getByText("A,B")).toBeTruthy();
	});

	it("builds layers with optional children and overrides", () => {
		const layer = makeLayer("T", undefined, { type: "text", value: "Hi" });
		expect(layer).toEqual({ id: "T", name: "T", type: "text", value: "Hi" });
		expect(makeLayer("F", [makeLayer("c")]).children?.[0].id).toBe("c");
	});

	it("provides the App.tsx breakpoints and Designer's layer types by default", () => {
		expect(breakpoints.map((bp) => [bp.id, bp.width, bp.height])).toEqual([
			["mobile", 375, 667],
			["tablet", 768, 1024],
			["desktop", 1440, 900],
		]);
		const { getByText } = renderInDesigner(<DesignerSummary />);
		expect(
			getByText(
				`mobile,tablet,desktop|${defaultLayerTypes.map((lt) => lt.type).join(",")}`
			)
		).toBeTruthy();
		expect(defaultLayerTypes.map((lt) => lt.type)).toEqual([
			"text",
			"image",
			"frame",
		]);
	});

	it("accepts a breakpoints override", () => {
		const { getByText } = renderInDesigner(<DesignerSummary />, {
			breakpoints: [breakpoints[1]],
		});
		expect(getByText(/^tablet\|/)).toBeTruthy();
	});
});
