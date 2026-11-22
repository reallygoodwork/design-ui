import { act, cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { makeLayer, renderInDesigner } from "../test/fixtures";
import { PaneLayerTree, rowStateClass } from "./PaneLayerTree";

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

// Rows in the layer tree, keyed by layer name
const rowsIn = () => {
	const tree = screen.getByRole("treegrid", { name: "Layer tree" });
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
	const byClass = row.classList.contains("bg-hover/50");
	const byAttr = row.getAttribute("data-in-selection") === "true";
	return byClass && byAttr;
};
const hasTintClass = (row: HTMLElement) =>
	row.classList.contains("bg-hover/50");

describe("subtree tint", () => {
	afterEach(cleanup);

	it("A: selecting Frame tints Child and Grandchild only", () => {
		const { select } = setup();
		select("Frame");
		const row = rowsIn();
		expect(tinted(row("Child"))).toBe(true);
		expect(tinted(row("Grandchild"))).toBe(true);
		expect(hasTintClass(row("Frame"))).toBe(false);
		expect(row("Frame").getAttribute("data-selected")).toBe("true");
		expect(hasTintClass(row("Other"))).toBe(false);
	});

	it("B: selecting Child tints Grandchild but not Frame", () => {
		const { select } = setup();
		select("Child");
		const row = rowsIn();
		expect(tinted(row("Grandchild"))).toBe(true);
		expect(hasTintClass(row("Frame"))).toBe(false);
		expect(hasTintClass(row("Child"))).toBe(false);
	});

	it("C: selecting a leaf tints nothing", () => {
		const { select } = setup();
		select("Grandchild");
		const row = rowsIn();
		for (const n of ["Frame", "Child", "Grandchild", "Other"]) {
			expect(hasTintClass(row(n))).toBe(false);
		}
	});

	it("D: changing selection leaves no stale tint", () => {
		const { select } = setup();
		select("Frame");
		select("Other");
		const row = rowsIn();
		for (const n of ["Frame", "Child", "Grandchild", "Other"]) {
			expect(hasTintClass(row(n))).toBe(false);
		}
	});

	it("E: shows one tree whichever breakpoint is active", () => {
		const { select } = setup();
		select("Frame", "desktop");
		expect(screen.getAllByRole("treegrid")).toHaveLength(1);
		expect(tinted(rowsIn()("Child"))).toBe(true);
		select("Other", "mobile");
		expect(rowsIn()("Other").getAttribute("data-selected")).toBe("true");
	});
});

describe("row click", () => {
	afterEach(cleanup);

	// The name wrapper is the parent of the name text span
	const nameWrapper = (row: HTMLElement, name: string) => {
		const span = within(row).getByText(name);
		const wrapper = span.parentElement;
		if (!wrapper) throw new Error("no wrapper");
		return wrapper;
	};

	it("clicking the name wrapper (not the text) selects the layer", async () => {
		setup();
		const user = userEvent.setup();
		const row = rowsIn();
		await user.click(nameWrapper(row("Other"), "Other"));
		expect(row("Other").getAttribute("aria-selected")).toBe("true");
	});

	it("double-clicking the name opens the rename input", async () => {
		setup();
		const user = userEvent.setup();
		const row = rowsIn();
		await user.dblClick(nameWrapper(row("Other"), "Other"));
		expect(within(row("Other")).getByRole("textbox")).toBeTruthy();
	});

	it("clicking the lock button toggles the lock without selecting", async () => {
		setup();
		const user = userEvent.setup();
		const row = rowsIn();
		await user.click(within(row("Other")).getByTitle("Lock layer"));
		expect(within(row("Other")).getByTitle("Unlock layer")).toBeTruthy();
		expect(row("Other").getAttribute("aria-selected")).not.toBe("true");
	});
});

const SelectedBreakpoint = () => {
	const { state } = useDesignerContext();
	return (
		<>
			<output data-testid="selected-bp">
				{state.selectedBreakpointId ?? ""}
			</output>
			<output data-testid="active-bp">{state.activeBreakpointId ?? ""}</output>
		</>
	);
};

describe("frames list", () => {
	afterEach(cleanup);

	const setupHeaders = () => {
		renderInDesigner(
			<>
				<SelectedBreakpoint />
				<PaneLayerTree />
			</>,
			{ layers: layers() }
		);
		return userEvent.setup();
	};
	const selectedBp = () => screen.getByTestId("selected-bp").textContent;
	const selectTarget = () =>
		screen.getByRole("button", { name: /^Tablet.*768/ });

	it("does not nest a button in a button or log DOM nesting errors", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
		try {
			setupHeaders();
			expect(document.querySelector("button button")).toBeNull();
			const messages = spy.mock.calls.map((c) => c.map(String).join(" "));
			expect(
				messages.filter(
					(m) =>
						m.includes("validateDOMNesting") ||
						m.includes("cannot be a descendant") ||
						m.includes("cannot appear as a descendant")
				)
			).toEqual([]);
		} finally {
			spy.mockRestore();
		}
	});

	it("clicking the select target selects the breakpoint", async () => {
		const user = setupHeaders();
		expect(selectedBp()).not.toBe("tablet");
		await user.click(selectTarget());
		expect(selectedBp()).toBe("tablet");
	});

	it("selecting a layer in the tree keeps the active breakpoint", async () => {
		const user = setupHeaders();
		await user.click(selectTarget());
		await user.click(rowsIn()("Other"));
		expect(screen.getByTestId("active-bp").textContent).toBe("tablet");
		expect(selectedBp()).toBe("");
	});
});

describe("drag handle", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("logs no missing drag-handle warning", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		const error = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		setup();
		const logged = [...warn.mock.calls, ...error.mock.calls]
			.flat()
			.map(String)
			.filter((m) => m.includes("Draggable items in a Tree must contain"));
		expect(logged).toEqual([]);
	});

	it("gives every row exactly one named drag button", () => {
		setup();
		const tree = screen.getByRole("treegrid", { name: "Layer tree" });
		const rows = within(tree).getAllByRole("row");
		expect(rows.length).toBeGreaterThan(0);
		for (const row of rows) {
			const handles = row.querySelectorAll('[slot="drag"]');
			expect(handles).toHaveLength(1);
			expect(handles[0].getAttribute("aria-label")).toMatch(/\S/);
		}
	});

	it("overlays the handle so it takes no layout space", () => {
		setup();
		const tree = screen.getByRole("treegrid", { name: "Layer tree" });
		for (const handle of tree.querySelectorAll('[slot="drag"]')) {
			expect(handle.classList.contains("absolute")).toBe(true);
		}
	});

	it("still selects on a row click", async () => {
		const { select } = setup();
		select("Other");
		const row = rowsIn();
		await userEvent.click(row("Frame"));
		expect(row("Frame").getAttribute("data-selected")).toBe("true");
	});
});

describe("row state classes", () => {
	const none = {
		isSelected: false,
		isHovered: false,
		isInSelection: false,
		isFocusVisible: false,
		isDropTarget: false,
	};
	const toks = (o: Partial<typeof none>) =>
		rowStateClass({ ...none, ...o }).split(/\s+/);

	it("selected: the selected surface", () => {
		const t = toks({ isSelected: true });
		expect(t).toContain("bg-selected");
		expect(t).toContain("text-foreground");
	});

	it("hover: the hover surface", () => {
		expect(toks({ isHovered: true })).toContain("bg-hover");
	});

	it("tint: half the hover surface", () => {
		expect(toks({ isInSelection: true })).toContain("bg-hover/50");
	});

	it("no state: no background", () => {
		const t = toks({});
		expect(t.some((c) => c.includes("bg-"))).toBe(false);
	});

	it("selected wins over in-selection and hover", () => {
		const t = toks({ isSelected: true, isInSelection: true, isHovered: true });
		expect(t).toContain("bg-selected");
		expect(t).not.toContain("bg-hover/50");
		expect(t).not.toContain("bg-hover");
	});

	it("hover wins over tint", () => {
		const t = toks({ isHovered: true, isInSelection: true });
		expect(t).toContain("bg-hover");
		expect(t).not.toContain("bg-hover/50");
	});

	it("drop target wins over selected", () => {
		const t = toks({ isDropTarget: true, isSelected: true });
		expect(t).toContain("bg-primary/20");
		expect(t).not.toContain("bg-selected");
	});

	it("rendered tinted row keeps data-in-selection and tint class", () => {
		const { select } = setup();
		select("Frame");
		const child = rowsIn()("Child");
		expect(child.getAttribute("data-in-selection")).toBe("true");
		expect(child.classList.contains("bg-hover/50")).toBe(true);
	});
});
