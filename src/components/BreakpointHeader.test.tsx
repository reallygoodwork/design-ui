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
});
