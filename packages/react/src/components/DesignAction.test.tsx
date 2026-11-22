import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AllowedContext, EVERYTHING } from "../hooks/useAllowed";
import { DesignAction } from "./DesignAction";

afterEach(cleanup);

describe("DesignAction", () => {
	it("keeps the clear button with the label, after the controls", () => {
		const onClear = vi.fn();
		render(
			<DesignAction label="Gap" clear={{ hasValue: true, onClear }}>
				<button type="button">Value</button>
			</DesignAction>
		);
		const clear = screen.getByRole("button", { name: "Clear Gap" });
		expect(clear.parentElement?.textContent).toContain("Gap");
		const buttons = screen.getAllByRole("button");
		expect(buttons[buttons.length - 1]).toBe(clear);
		fireEvent.click(clear);
		expect(onClear).toHaveBeenCalled();
	});

	it("says reset when the value overrides a smaller breakpoint", () => {
		render(
			<DesignAction
				label={"Gap •"}
				clear={{ hasValue: true, onClear: () => undefined }}
			>
				<span />
			</DesignAction>
		);
		expect(
			screen.getByRole("button", { name: "Reset Gap to inherited" })
		).toBeTruthy();
	});

	it("has no clear button when there's nothing to clear with", () => {
		render(
			<DesignAction label="Gap">
				<span />
			</DesignAction>
		);
		expect(screen.queryByRole("button")).toBeNull();
	});
});

describe("editing rules", () => {
	it("hides a row whose property the rules don't let this role change", () => {
		const { container } = render(
			<AllowedContext.Provider
				value={{ ...EVERYTHING, editableProperties: ["--color"] }}
			>
				<DesignAction label="Size" property="--font-size">
					<input />
				</DesignAction>
				<DesignAction label="Color" property="--color">
					<input />
				</DesignAction>
			</AllowedContext.Provider>
		);
		const rows = container.querySelectorAll("[data-slot=action]");
		expect([...rows].map((r) => r.getAttribute("data-css-prop"))).toEqual([
			"--color",
		]);
	});
});
