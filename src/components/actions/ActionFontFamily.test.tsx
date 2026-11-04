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
	frameStyles?: Record<string, string>
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
			payload: { layerId: "T", shiftKey: false, breakpointId: "mobile" },
		});
	});
	const trigger = screen.getByRole("button", {
		name: /Georgia|Default|Lato|Arial/,
	});
	return trigger;
};

beforeEach(() => {
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
});
