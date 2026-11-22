import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DesignerProvider } from "../../context/DesignerContext";
import { useDesignerContext } from "../../hooks/useDesignerContext";
import type { CSSVars } from "../../lib/Types";
import { breakpoints, defaultLayerTypes, makeLayer } from "../../test/fixtures";
import { convertUnit } from "../common/UnitField";
import { ActionLayout } from "./ActionLayout";

type Ctx = ReturnType<typeof useDesignerContext>;
const ref: { ctx: Ctx | null } = { ctx: null };
const Capture = () => {
	ref.ctx = useDesignerContext();
	return null;
};

const setup = (
	cssVars: CSSVars,
	breakpointId = "mobile",
	breakpointCssVars?: Record<string, CSSVars>
) => {
	render(
		<DesignerProvider
			defaultLayers={[makeLayer("L", [], { cssVars, breakpointCssVars })]}
			defaultLayerTypes={defaultLayerTypes}
			breakpoints={breakpoints}
		>
			<Capture />
			<ActionLayout />
		</DesignerProvider>
	);
	act(() => {
		ref.ctx?.dispatch({
			type: "SELECT_LAYER",
			payload: { layerId: "L", shiftKey: false, breakpointId },
		});
	});
};

const layer = () => ref.ctx?.state.layers[0];

afterEach(cleanup);

describe("ActionLayout", () => {
	it("sets direction from the mode tabs", () => {
		setup({});
		fireEvent.click(screen.getByRole("button", { name: "Column" }));
		expect(layer()?.cssVars?.["--display"]).toBe("flex");
		expect(layer()?.cssVars?.["--flex-direction"]).toBe("column");
	});

	it("overrides an inherited layout at a larger breakpoint", () => {
		setup({ "--display": "flex", "--flex-direction": "row" }, "desktop");
		fireEvent.click(screen.getByRole("button", { name: "Default" }));
		expect(layer()?.breakpointCssVars?.desktop?.["--display"]).toBe("block");
		expect(layer()?.cssVars?.["--display"]).toBe("flex");
	});

	it("maps the pad to the layer's direction", () => {
		setup({ "--display": "flex", "--flex-direction": "column" });
		fireEvent.click(screen.getByRole("radio", { name: "Bottom right" }));
		expect(layer()?.cssVars?.["--align-items"]).toBe("flex-end");
		expect(layer()?.cssVars?.["--justify-content"]).toBe("flex-end");
	});

	it("shows the unit on every box value", () => {
		setup({ "--padding-block-start": "2rem" });
		const top = screen.getByLabelText("Padding top") as HTMLInputElement;
		expect(top.value).toBe("2rem");
	});

	it("edits all sides together when linked, one when not", () => {
		setup({});
		const top = () => screen.getByLabelText("Padding top");
		fireEvent.change(top(), { target: { value: "24" } });
		// Typed numbers apply on a pause, Enter or blur
		fireEvent.blur(top());
		expect(layer()?.cssVars?.["--padding-inline-start"]).toBe("24px");
		fireEvent.click(screen.getByLabelText("Edit all padding sides together"));
		fireEvent.change(top(), { target: { value: "8" } });
		// Typed numbers apply on a pause, Enter or blur
		fireEvent.blur(top());
		expect(layer()?.cssVars?.["--padding-block-start"]).toBe("8px");
		expect(layer()?.cssVars?.["--padding-inline-start"]).toBe("24px");
	});

	it("shows an inherited value as a hint and writes only an override", () => {
		setup({ "--padding-block-start": "40px" }, "desktop");
		const top = screen.getByLabelText("Padding top") as HTMLInputElement;
		expect(top.value).toBe("");
		expect(top.placeholder).toBe("40px");
		fireEvent.click(screen.getByLabelText("Edit all padding sides together"));
		fireEvent.change(top, { target: { value: "96" } });
		// Typed numbers apply on a pause, Enter or blur
		fireEvent.blur(top);
		expect(layer()?.cssVars?.["--padding-block-start"]).toBe("40px");
		expect(layer()?.breakpointCssVars?.desktop?.["--padding-block-start"]).toBe(
			"96px"
		);
	});

	it("spreads children when the main gap is Auto", () => {
		setup({ "--display": "flex", "--column-gap": "8px" });
		const gap = screen.getByLabelText("Gap", {
			selector: "input",
		}) as HTMLInputElement;
		fireEvent.change(gap, { target: { value: "auto" } });
		fireEvent.keyDown(gap, { key: "Enter" });
		expect(layer()?.cssVars?.["--justify-content"]).toBe("space-between");
		expect(layer()?.cssVars?.["--column-gap"]).toBeUndefined();
	});

	it("types Fill and Hug into a size", () => {
		setup({});
		const width = screen.getByLabelText("Width") as HTMLInputElement;
		fireEvent.change(width, { target: { value: "fill" } });
		fireEvent.blur(width);
		expect(layer()?.cssVars?.["--width"]).toBe("100%");
	});
});

describe("box model units", () => {
	it("converts every side when the padding unit changes", async () => {
		setup({
			"--padding-block-start": "32px",
			"--padding-inline-end": "16px",
		});
		const picker = screen.getByRole("combobox", { name: "Padding unit" });
		await userEvent.click(picker);
		await userEvent.click(await screen.findByRole("option", { name: "rem" }));
		expect(layer()?.cssVars?.["--padding-block-start"]).toBe("2rem");
		expect(layer()?.cssVars?.["--padding-inline-end"]).toBe("1rem");
	});

	it("reports mixed units", () => {
		setup({
			"--padding-block-start": "2rem",
			"--padding-inline-end": "16px",
		});
		expect(
			screen.getByRole("combobox", { name: "Padding unit" }).textContent
		).toContain("Mixed");
	});
});

describe("non-numeric values", () => {
	it("shows calc() as written and labels it CSS", () => {
		setup({ "--width": "calc(100% - 48px)" });
		const width = screen.getByLabelText("Width") as HTMLInputElement;
		expect(width.value).toBe("calc(100% - 48px)");
		expect(width.closest("[data-slot=input-number]")?.textContent).toContain(
			"CSS"
		);
	});

	it("doesn't overwrite calc() when dragged", () => {
		setup({ "--width": "calc(100% - 48px)" });
		const width = screen.getByLabelText("Width");
		fireEvent.pointerDown(width, { button: 0, pointerId: 1, clientX: 100 });
		fireEvent.pointerMove(width, { pointerId: 1, clientX: 180 });
		fireEvent.pointerUp(width, { pointerId: 1, clientX: 180 });
		expect(layer()?.cssVars?.["--width"]).toBe("calc(100% - 48px)");
	});
});

describe("convertUnit", () => {
	it("keeps the size between px and rem", () => {
		expect(convertUnit(32, "px", "rem")).toBe(2);
		expect(convertUnit(1.5, "rem", "px")).toBe(24);
	});

	it("leaves units it can't relate alone", () => {
		expect(convertUnit(50, "px", "%")).toBe(50);
	});
});
