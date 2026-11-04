import { act, cleanup, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { makeLayer, renderInDesigner } from "../test/fixtures";
import { PaneLayerTree } from "./PaneLayerTree";

type Dispatch = ReturnType<typeof useDesignerAction>;

const layers = () => [
	makeLayer("Frame", [makeLayer("Child", [makeLayer("Grandchild")])]),
	makeLayer("Other"),
];

const ref: { dispatch: Dispatch | null } = { dispatch: null };
const Capture = () => {
	ref.dispatch = useDesignerAction();
	return null;
};

const setup = () => {
	renderInDesigner(
		<>
			<Capture />
			<PaneLayerTree />
		</>,
		{ layers: layers() }
	);
	const select = (layerId: string, breakpointId = "desktop") =>
		act(() => {
			ref.dispatch?.({
				type: "SELECT_LAYER",
				payload: { layerId, shiftKey: false, breakpointId },
			});
		});
	return { select };
};

// Rows in the given breakpoint's tree, keyed by layer name
const rowsIn = (breakpointName: string) => {
	const tree = screen.getByRole("treegrid", {
		name: `${breakpointName} layer tree`,
	});
	return (name: string) => {
		const row = within(tree)
			.getAllByRole("row")
			.find(
				(r) =>
					r.getAttribute("data-key") === name || r.textContent?.startsWith(name)
			);
		if (!row) throw new Error(`no row ${name}`);
		return row;
	};
};

// Tinted means the lighter class AND the test hook agree
const tinted = (row: HTMLElement) => {
	const byClass = row.classList.contains("bg-accent/30");
	const byAttr = row.getAttribute("data-in-selection") === "true";
	return byClass && byAttr;
};
const hasTintClass = (row: HTMLElement) =>
	row.classList.contains("bg-accent/30");

describe("subtree tint", () => {
	afterEach(cleanup);

	it("A: selecting Frame tints Child and Grandchild only", () => {
		const { select } = setup();
		select("Frame");
		const row = rowsIn("Desktop");
		expect(tinted(row("Child"))).toBe(true);
		expect(tinted(row("Grandchild"))).toBe(true);
		expect(hasTintClass(row("Frame"))).toBe(false);
		expect(row("Frame").getAttribute("data-selected")).toBe("true");
		expect(hasTintClass(row("Other"))).toBe(false);
	});

	it("B: selecting Child tints Grandchild but not Frame", () => {
		const { select } = setup();
		select("Child");
		const row = rowsIn("Desktop");
		expect(tinted(row("Grandchild"))).toBe(true);
		expect(hasTintClass(row("Frame"))).toBe(false);
		expect(hasTintClass(row("Child"))).toBe(false);
	});

	it("C: selecting a leaf tints nothing", () => {
		const { select } = setup();
		select("Grandchild");
		const row = rowsIn("Desktop");
		for (const n of ["Frame", "Child", "Grandchild", "Other"]) {
			expect(hasTintClass(row(n))).toBe(false);
		}
	});

	it("D: changing selection leaves no stale tint", () => {
		const { select } = setup();
		select("Frame");
		select("Other");
		const row = rowsIn("Desktop");
		for (const n of ["Frame", "Child", "Grandchild", "Other"]) {
			expect(hasTintClass(row(n))).toBe(false);
		}
	});

	it("E: tint appears only in the active breakpoint's tree", () => {
		const { select } = setup();
		select("Frame", "desktop");
		expect(tinted(rowsIn("Desktop")("Child"))).toBe(true);
		expect(hasTintClass(rowsIn("Mobile")("Child"))).toBe(false);
		expect(hasTintClass(rowsIn("Tablet")("Grandchild"))).toBe(false);
	});
});
