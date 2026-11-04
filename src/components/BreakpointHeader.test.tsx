import { cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { breakpoints, renderInDesigner } from "../test/fixtures";
import { BreakpointHeader } from "./BreakpointHeader";

const Probe = () => {
	const { state } = useDesignerContext();
	return (
		<>
			<BreakpointHeader
				breakpoint={breakpoints[1]}
				isActive={false}
				isSelected={false}
			/>
			<output data-testid="selected">{state.selectedBreakpointId ?? ""}</output>
			<output data-testid="pos">
				{state.breakpoints
					.filter((b) => b.id === "tablet")
					.map((b) => `${b.position.x},${b.position.y}`)}
			</output>
			<output data-testid="count">{state.breakpoints.length}</output>
		</>
	);
};

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("BreakpointHeader", () => {
	it("does not nest a button inside a button", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { container } = renderInDesigner(<Probe />);
		expect(container.querySelector("button button")).toBeNull();
		const messages = error.mock.calls.map((c) => c.join(" "));
		expect(
			messages.filter(
				(m) =>
					m.includes("validateDOMNesting") ||
					m.includes("cannot be a descendant")
			)
		).toEqual([]);
	});

	it("selects the breakpoint when the header is clicked", () => {
		const { getByText, getByTestId } = renderInDesigner(<Probe />);
		expect(getByTestId("selected").textContent).toBe("");
		fireEvent.click(getByText("Tablet"));
		expect(getByTestId("selected").textContent).toBe("tablet");
	});

	it("add button adds a breakpoint without selecting the header", () => {
		const { getByTitle, getByTestId } = renderInDesigner(<Probe />);
		fireEvent.click(getByTitle("Add breakpoint"));
		expect(getByTestId("count").textContent).toBe(
			String(breakpoints.length + 1)
		);
		expect(getByTestId("selected").textContent).toBe("");
	});

	it("has a separate focusable select button that selects", () => {
		const { getByRole, getByTitle, getByTestId } = renderInDesigner(<Probe />);
		const select = getByRole("button", { name: /Tablet/ });
		expect(select.contains(getByTitle("Add breakpoint"))).toBe(false);
		select.focus();
		expect(document.activeElement).toBe(select);
		fireEvent.click(select);
		expect(getByTestId("selected").textContent).toBe("tablet");
	});

	it("drags the frame from the select button but not from the add button", () => {
		const { getByRole, getByTitle, getByTestId } = renderInDesigner(<Probe />);
		const pos = () => getByTestId("pos").textContent;
		expect(pos()).toBe("425,0");
		fireEvent.mouseDown(getByTitle("Add breakpoint"), {
			clientX: 0,
			clientY: 0,
		});
		fireEvent.mouseMove(document, { clientX: 30, clientY: 10 });
		fireEvent.mouseUp(document);
		expect(pos()).toBe("425,0");
		fireEvent.mouseDown(getByRole("button", { name: /Tablet/ }), {
			clientX: 0,
			clientY: 0,
		});
		fireEvent.mouseMove(document, { clientX: 30, clientY: 10 });
		fireEvent.mouseUp(document);
		expect(pos()).toBe("455,10");
	});
});
