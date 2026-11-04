import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DesignerProvider } from "../../context/DesignerContext";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useDesignerContext } from "../../hooks/useDesignerContext";
import { applyCssVars } from "../../lib/cssPropertyMapping";
import { frameLayerType } from "../../lib/layers/frame";
import { breakpoints, defaultLayerTypes, makeLayer } from "../../test/fixtures";
import { ActionOpacity } from "./ActionOpacity";

type Ctx = ReturnType<typeof useDesignerContext>;
const ref: {
	dispatch: ReturnType<typeof useDesignerAction> | null;
	ctx: Ctx | null;
} = { dispatch: null, ctx: null };
const Capture = () => {
	ref.dispatch = useDesignerAction();
	ref.ctx = useDesignerContext();
	return null;
};

const setup = (
	cssVars: Record<string, string> | undefined,
	breakpointId = "mobile"
) => {
	render(
		<DesignerProvider
			defaultLayers={[makeLayer("L", undefined, { cssVars })]}
			defaultLayerTypes={defaultLayerTypes}
			breakpoints={breakpoints}
		>
			<Capture />
			<ActionOpacity />
		</DesignerProvider>
	);
	act(() => {
		ref.dispatch?.({
			type: "SELECT_LAYER",
			payload: { layerId: "L", shiftKey: false, breakpointId },
		});
	});
	return screen.getByRole("textbox") as HTMLInputElement;
};

const layer = () => ref.ctx?.state.layers[0];

/** Render the layer through the frame layer type, as the canvas does. */
const renderedOpacity = (cssVars: Record<string, string> = {}) => {
	const { container } = render(
		<div>
			{frameLayerType.render({
				id: "R",
				name: "R",
				type: "frame",
				value: "",
				cssVars,
				style: {},
				effectiveCssVars: cssVars,
			})}
		</div>
	);
	const el = container.firstElementChild?.firstElementChild as HTMLElement;
	return el.style.opacity;
};

afterEach(cleanup);

describe("ActionOpacity", () => {
	it("stores a valid CSS opacity for 50 and the layer renders it", () => {
		const input = setup(undefined);
		fireEvent.change(input, { target: { value: "50" } });
		const stored = layer()?.cssVars?.["--opacity"];
		expect(stored).toBe("0.5");
		expect(renderedOpacity(layer()?.cssVars)).toBe("0.5");
		expect(applyCssVars(layer()?.cssVars).opacity).toBe("0.5");
	});

	it("maps 0 and 100 to 0 and 1", () => {
		const input = setup({ "--opacity": "0.5" });
		fireEvent.change(input, { target: { value: "100" } });
		expect(layer()?.cssVars?.["--opacity"]).toBe("1");
		fireEvent.change(input, { target: { value: "0" } });
		expect(layer()?.cssVars?.["--opacity"]).toBe("0");
	});

	it("shows 50 for a stored 0.5", () => {
		expect(setup({ "--opacity": "0.5" }).value).toBe("50");
	});

	it("shows 50 for a legacy stored 50", () => {
		const input = setup({ "--opacity": "50" });
		expect(input.value).toBe("50");
		expect(screen.getByRole("slider").getAttribute("aria-valuenow") ?? "").toBe(
			"50"
		);
	});

	it("writes on a non-primary breakpoint as an override", () => {
		const input = setup({ "--opacity": "1" }, "tablet");
		fireEvent.change(input, { target: { value: "50" } });
		expect(layer()?.breakpointCssVars?.tablet?.["--opacity"]).toBe("0.5");
		expect(layer()?.cssVars?.["--opacity"]).toBe("1");
		expect(input.value).toBe("50");
	});
});
