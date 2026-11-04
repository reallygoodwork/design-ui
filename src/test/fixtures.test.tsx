import { describe, expect, it } from "vitest";
import { initialState, reducer } from "../hooks/useDesigner";
import { useLayers } from "../hooks/useLayers";
import { makeLayer, renderInDesigner } from "./fixtures";

const LayerIds = () => (
	<p>
		{useLayers()
			.map((l) => l.id)
			.join(",")}
	</p>
);

describe("test infrastructure", () => {
	it("runs the reducer against fixture layers", () => {
		const state = reducer(
			{ ...initialState, layers: [makeLayer("A")] },
			{ type: "DESELECT_ALL" }
		);
		expect(state.layers.map((l) => l.id)).toEqual(["A"]);
	});

	it("renders UI inside a DesignerProvider with fixture layers", () => {
		const { getByText } = renderInDesigner(<LayerIds />, {
			layers: [makeLayer("A", [makeLayer("a1")]), makeLayer("B")],
		});
		expect(getByText("A,B")).toBeTruthy();
	});
});
