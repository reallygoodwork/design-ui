import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InputGroup } from "./InputGroup";
import { snapToStep } from "./ScrubField";

afterEach(cleanup);

const onChange = vi.fn();

const Field = ({
	initial = 50,
	min,
	max,
	step,
}: {
	initial?: number;
	min?: number;
	max?: number;
	step?: number;
}) => {
	const [value, setValue] = useState(initial);
	return (
		<InputGroup
			value={String(value)}
			scrub={{
				value,
				min,
				max,
				step,
				onChange: (next) => {
					onChange(next);
					setValue(next);
				},
			}}
		/>
	);
};

const press = (input: HTMLElement, clientX: number) => {
	fireEvent.mouseDown(input, { button: 0, clientX });
	fireEvent.pointerDown(input, { button: 0, pointerId: 1, clientX });
};
const move = (input: HTMLElement, clientX: number) =>
	fireEvent.pointerMove(input, { pointerId: 1, clientX });
const release = (input: HTMLElement, clientX: number) =>
	fireEvent.pointerUp(input, { pointerId: 1, clientX });

describe("snapToStep", () => {
	it("clamps to the range", () => {
		expect(snapToStep(140, 1, 0, 100)).toBe(100);
		expect(snapToStep(-3, 1, 0, 100)).toBe(0);
	});

	it("counts steps from min", () => {
		expect(snapToStep(112, 10, 105, 200)).toBe(115);
	});

	it("does not accumulate floating point error", () => {
		expect(snapToStep(0.30000000000000004, 0.1)).toBe(0.3);
	});
});

describe("ScrubField", () => {
	it("changes the value when dragged", () => {
		onChange.mockClear();
		render(<Field />);
		const input = screen.getByRole("spinbutton");
		press(input, 100);
		move(input, 110);
		release(input, 110);
		expect(onChange).toHaveBeenLastCalledWith(60);
	});

	it("stops at max and min however far the drag goes", () => {
		render(<Field min={0} max={100} />);
		const input = screen.getByRole("spinbutton") as HTMLInputElement;
		press(input, 100);
		move(input, 5000);
		expect(input.value).toBe("100");
		move(input, -5000);
		expect(input.value).toBe("0");
		release(input, -5000);
	});

	it("focuses for typing on a click without a drag", () => {
		onChange.mockClear();
		render(<Field />);
		const input = screen.getByRole("spinbutton");
		press(input, 100);
		move(input, 101);
		release(input, 101);
		expect(onChange).not.toHaveBeenCalled();
		expect(document.activeElement).toBe(input);
	});

	it("leaves a focused field to text editing", () => {
		onChange.mockClear();
		render(<Field />);
		const input = screen.getByRole("spinbutton") as HTMLInputElement;
		input.focus();
		press(input, 100);
		move(input, 150);
		release(input, 150);
		expect(onChange).not.toHaveBeenCalled();
	});

	it("steps with the arrow keys and respects max", () => {
		render(<Field initial={99} max={100} />);
		const input = screen.getByRole("spinbutton") as HTMLInputElement;
		fireEvent.keyDown(input, { key: "ArrowUp" });
		fireEvent.keyDown(input, { key: "ArrowUp" });
		expect(input.value).toBe("100");
	});
});
