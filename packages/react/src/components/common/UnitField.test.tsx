import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UnitField } from "./UnitField";

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

const Field = ({
	initial = "16px",
	...props
}: {
	initial?: string;
	min?: number;
	max?: number;
	units?: string[];
}) => {
	const [value, setValue] = useState(initial);
	return (
		<>
			<UnitField
				ariaLabel="Size"
				value={value || undefined}
				onChange={setValue}
				{...props}
			/>
			<output>{value}</output>
		</>
	);
};

const input = () => screen.getByLabelText("Size") as HTMLInputElement;
const stored = () => screen.getByRole("status").textContent;

describe("UnitField", () => {
	it("keeps the unit menu outside the slider's drag area", () => {
		render(<Field />);
		const menu = screen.getByRole("combobox");
		expect(menu.closest("[data-slot=scrub-field]")).toBeNull();
		expect(input().closest("[data-slot=scrub-field]")).not.toBeNull();
	});

	it("keeps the unit when a plain number is typed", () => {
		vi.useFakeTimers();
		render(<Field />);
		fireEvent.change(input(), { target: { value: "24" } });
		act(() => vi.advanceTimersByTime(300));
		expect(stored()).toBe("24px");
	});

	it("waits for typing to pause before applying a number", () => {
		vi.useFakeTimers();
		render(<Field />);
		fireEvent.change(input(), { target: { value: "2" } });
		act(() => vi.advanceTimersByTime(100));
		fireEvent.change(input(), { target: { value: "24" } });
		act(() => vi.advanceTimersByTime(200));
		expect(stored()).toBe("16px");
		act(() => vi.advanceTimersByTime(100));
		expect(stored()).toBe("24px");
	});

	it("doesn't apply a number in the old unit while a new one is typed", () => {
		vi.useFakeTimers();
		render(<Field initial="3rem" />);
		for (const text of ["2", "20", "20p", "20px"]) {
			fireEvent.change(input(), { target: { value: text } });
			act(() => vi.advanceTimersByTime(120));
		}
		act(() => vi.advanceTimersByTime(1000));
		expect(stored()).toBe("3rem");
		fireEvent.keyDown(input(), { key: "Enter" });
		expect(stored()).toBe("20px");
	});

	it("applies a typed number at once on Enter", () => {
		vi.useFakeTimers();
		render(<Field />);
		fireEvent.change(input(), { target: { value: "24" } });
		fireEvent.keyDown(input(), { key: "Enter" });
		expect(stored()).toBe("24px");
		act(() => vi.advanceTimersByTime(1000));
		expect(stored()).toBe("24px");
	});

	it("drops a pending number when the arrows step the value", () => {
		vi.useFakeTimers();
		render(<Field />);
		fireEvent.change(input(), { target: { value: "40" } });
		fireEvent.keyDown(input(), { key: "ArrowUp" });
		act(() => vi.advanceTimersByTime(1000));
		expect(stored()).toBe("17px");
	});

	it("switches unit when a typed unit is committed", () => {
		render(<Field />);
		fireEvent.change(input(), { target: { value: "2rem" } });
		expect(stored()).toBe("16px");
		fireEvent.blur(input());
		expect(stored()).toBe("2rem");
	});

	it("ignores a unit the control doesn't offer", () => {
		render(<Field units={["px", "%"]} />);
		fireEvent.change(input(), { target: { value: "2rem" } });
		fireEvent.keyDown(input(), { key: "Enter" });
		expect(stored()).toBe("16px");
	});

	it("clamps typed values to the range", () => {
		vi.useFakeTimers();
		render(<Field min={0} max={100} />);
		fireEvent.change(input(), { target: { value: "500" } });
		act(() => vi.advanceTimersByTime(300));
		expect(stored()).toBe("100px");
	});

	it("clears when emptied", () => {
		render(<Field />);
		fireEvent.change(input(), { target: { value: "" } });
		expect(stored()).toBe("");
	});

	it("treats a bare number as unitless when the control allows it", () => {
		render(<Field initial="1.5" units={["px", ""]} />);
		fireEvent.keyDown(input(), { key: "ArrowUp" });
		expect(stored()).toBe("1.6");
	});
});
