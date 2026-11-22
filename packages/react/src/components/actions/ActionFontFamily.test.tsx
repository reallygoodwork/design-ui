import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DesignerProvider } from "../../context/DesignerContext";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useDesignerContext } from "../../hooks/useDesignerContext";
import { breakpoints, defaultLayerTypes, makeLayer } from "../../test/fixtures";
import { ActionFontFamily } from "./ActionFontFamily";

const dispatched: unknown[] = [];
vi.mock("../../hooks/useDesignerContext", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("../../hooks/useDesignerContext")>();
	return {
		...actual,
		useDesignerContext: () => {
			const ctx = actual.useDesignerContext();
			return {
				...ctx,
				dispatch: (action: unknown) => {
					dispatched.push(action);
					(ctx.dispatch as (a: unknown) => void)(action);
				},
			};
		},
	};
});

type Dispatch = ReturnType<typeof useDesignerAction>;
type Ctx = ReturnType<typeof useDesignerContext>;
const ref: { dispatch: Dispatch | null; ctx: Ctx | null } = {
	dispatch: null,
	ctx: null,
};
const Capture = () => {
	ref.dispatch = useDesignerAction();
	ref.ctx = useDesignerContext();
	return null;
};

const setup = (
	cssVars: Record<string, string> | undefined,
	frameStyles?: Record<string, string>,
	breakpointId = "mobile"
) => {
	render(
		<DesignerProvider
			defaultLayers={[
				makeLayer("T", undefined, { type: "text", value: "Hi", cssVars }),
			]}
			defaultLayerTypes={defaultLayerTypes}
			breakpoints={breakpoints}
			frameStyles={frameStyles}
		>
			<Capture />
			<ActionFontFamily />
		</DesignerProvider>
	);
	act(() => {
		ref.dispatch?.({
			type: "SELECT_LAYER",
			payload: { layerId: "T", shiftKey: false, breakpointId },
		});
	});
	const trigger = screen.getByRole("button", {
		name: /Georgia|Default|Lato|Arial/,
	});
	return trigger;
};

beforeEach(() => {
	vi.stubEnv("VITE_GOOGLE_API_KEY", "test-key");
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
	);
	Element.prototype.scrollIntoView = () => {};
	vi.stubGlobal(
		"fetch",
		vi.fn(() =>
			Promise.resolve({
				json: () =>
					Promise.resolve({
						items: [{ family: "Lato" }, { family: "Roboto" }],
					}),
			})
		)
	);
});

afterEach(() => {
	dispatched.length = 0;
	cleanup();
	vi.unstubAllGlobals();
});

describe("ActionFontFamily", () => {
	it("shows the frame font, marked inherited, when the layer has none", () => {
		const trigger = setup(undefined, { "--font-family": "Georgia" });
		expect(trigger.textContent).toBe("Georgia");
		expect(trigger.getAttribute("data-empty")).toBe("true");
	});

	it("shows Default, not Arial, with no layer or frame font", () => {
		const trigger = setup(undefined);
		expect(trigger.textContent).toBe("Default");
		expect(trigger.textContent).not.toContain("Arial");
	});

	it("shows an explicit layer font unmarked", () => {
		const trigger = setup(
			{ "--font-family": "Lato" },
			{ "--font-family": "Georgia" }
		);
		expect(trigger.textContent).toBe("Lato");
		expect(trigger.getAttribute("data-empty")).toBe("false");
	});

	it("dispatches UPDATE_LAYER_CSS with --font-family on select", async () => {
		const trigger = setup(undefined, { "--font-family": "Georgia" });
		fireEvent.click(trigger);
		const item = await screen.findByText("Roboto");
		fireEvent.click(item);
		const layer = ref.ctx?.state.layers[0];
		expect(layer?.cssVars?.["--font-family"]).toBe("Roboto");
	});

	it("writes a Tablet override, leaving base cssVars untouched", async () => {
		const trigger = setup({ "--font-family": "Lato" }, undefined, "tablet");
		expect(trigger.textContent).toBe("Lato");
		fireEvent.click(trigger);
		fireEvent.click(await screen.findByText("Roboto"));
		expect(dispatched).toContainEqual({
			type: "UPDATE_LAYER_CSS",
			payload: {
				id: "T",
				css: { "--font-family": "Roboto" },
				breakpointId: "tablet",
			},
		});
		const layer = ref.ctx?.state.layers[0];
		expect(layer?.breakpointCssVars?.tablet?.["--font-family"]).toBe("Roboto");
		expect(layer?.cssVars?.["--font-family"]).toBe("Lato");
	});

	it("shows a smaller-breakpoint font as inherited, then an override, then clears it", async () => {
		const trigger = setup({ "--font-family": "Lato" }, undefined, "tablet");
		const clear = () => {
			const buttons = screen.getAllByRole("button");
			return buttons[buttons.length - 1] as HTMLButtonElement;
		};
		expect(trigger.textContent).toBe("Lato");
		expect(trigger.getAttribute("data-empty")).toBe("true");
		expect(clear().disabled).toBe(true);

		fireEvent.click(trigger);
		fireEvent.click(await screen.findByText("Roboto"));
		expect(trigger.textContent).toBe("Roboto");
		expect(trigger.getAttribute("data-empty")).toBe("false");
		expect(clear().disabled).toBe(false);

		fireEvent.click(clear());
		const layer = ref.ctx?.state.layers[0];
		expect(trigger.textContent).toBe("Lato");
		expect(trigger.getAttribute("data-empty")).toBe("true");
		expect(clear().disabled).toBe(true);
		expect(layer?.cssVars?.["--font-family"]).toBe("Lato");
		expect(layer?.breakpointCssVars?.tablet?.["--font-family"]).toBeFalsy();
	});
});
