import { act, cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { makeLayer, renderInDesigner } from "../test/fixtures";
import { DesignToolbarContainer } from "./DesignToolbarContainer";
import { PaneLayerTree } from "./PaneLayerTree";

const ref: {
	dispatch: ReturnType<typeof useDesignerAction> | null;
	dialog: unknown;
} = { dispatch: null, dialog: null };

const Capture = () => {
	ref.dispatch = useDesignerAction();
	ref.dialog = useDesignerContext().state.addLayerDialog;
	return null;
};

const setup = () => {
	renderInDesigner(
		<>
			<Capture />
			<DesignToolbarContainer />
			<PaneLayerTree />
		</>,
		{
			layers: [
				makeLayer("Card", [makeLayer("Copy", undefined, { type: "text" })]),
			],
		}
	);
	return (layerId: string) =>
		act(() => {
			ref.dispatch?.({
				type: "SELECT_LAYER",
				payload: { layerId, shiftKey: false },
			});
		});
};

afterEach(cleanup);

describe("Add layer entry points", () => {
	it("shows no add buttons with nothing selected", () => {
		setup();
		expect(
			screen.queryByRole("button", { name: /Add layer inside/ })
		).toBeNull();
	});

	it("shows no add buttons for a layer that can't hold others", () => {
		const select = setup();
		select("Copy");
		expect(
			screen.queryByRole("button", { name: /Add layer inside/ })
		).toBeNull();
	});

	it("opens Add layer inside the selected container from the toolbar", async () => {
		const select = setup();
		select("Card");
		const buttons = screen.getAllByRole("button", {
			name: "Add layer inside Card",
		});
		// One in the toolbar, one on the layer's row
		expect(buttons).toHaveLength(2);
		await userEvent.click(buttons[0]);
		expect(ref.dialog).toEqual({
			open: true,
			layerId: "Card",
			position: "inside",
		});
	});

	it("opens Add layer inside the selected container from the layer tree", async () => {
		const select = setup();
		select("Card");
		const buttons = screen.getAllByRole("button", {
			name: "Add layer inside Card",
		});
		await userEvent.click(buttons[1]);
		expect(ref.dialog).toEqual({
			open: true,
			layerId: "Card",
			position: "inside",
		});
	});
});

describe("Add layer under editing rules", () => {
	const setupWithRules = (role: "builder" | "editor") => {
		renderInDesigner(
			<>
				<Capture />
				<DesignToolbarContainer />
				<PaneLayerTree />
			</>,
			{
				layers: [
					makeLayer("Card", [makeLayer("Copy", undefined, { type: "text" })]),
				],
				rules: [
					{
						id: "card-locked",
						target: { layerIds: ["Card"] },
						structure: { locked: true },
					},
				],
				role,
			}
		);
		act(() => {
			ref.dispatch?.({
				type: "SELECT_LAYER",
				payload: { layerId: "Card", shiftKey: false },
			});
		});
	};

	it("offers no Add layer inside a locked layer to editors", () => {
		setupWithRules("editor");
		expect(
			screen.queryByRole("button", { name: /Add layer inside/ })
		).toBeNull();
	});

	it("still offers it to builders", () => {
		setupWithRules("builder");
		expect(
			screen.getAllByRole("button", { name: "Add layer inside Card" })
		).toHaveLength(2);
	});
});
