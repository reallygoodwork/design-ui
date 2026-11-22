import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ActionTextAlign } from "../components/actions/ActionTextAlign";
import { DesignerProvider } from "../context/DesignerContext";
import type { Layer } from "../lib/Types";
import { breakpoints, defaultLayerTypes, makeLayer } from "../test/fixtures";
import { useDesignerAction } from "./useDesignerAction";
import { useDesignerContext } from "./useDesignerContext";
import { useKeybindings } from "./useKeybindings";

type Ctx = ReturnType<typeof useDesignerContext>;
const ref: { ctx: Ctx | null } = { ctx: null };

const Harness = ({ children }: { children?: ReactNode }) => {
	useKeybindings();
	ref.ctx = useDesignerContext();
	return <>{children}</>;
};

let dispatch: ReturnType<typeof useDesignerAction>;
const Capture = () => {
	dispatch = useDesignerAction();
	return null;
};

const setup = (layers: Layer[], selected: string | null, ui?: ReactNode) => {
	render(
		<DesignerProvider
			defaultLayers={layers}
			defaultLayerTypes={defaultLayerTypes}
			breakpoints={breakpoints}
		>
			<Capture />
			<Harness>{ui}</Harness>
		</DesignerProvider>
	);
	if (selected) {
		fireEvent.click(document.body);
		act(() => {
			ref.ctx?.dispatch({
				type: "SELECT_LAYER",
				payload: { layerId: selected, shiftKey: false },
			});
		});
	}
};

const press = (init: KeyboardEventInit) =>
	fireEvent.keyDown(document.body, init);

const layers = () => ref.ctx?.state.layers ?? [];

beforeEach(() => {
	ref.ctx = null;
});
afterEach(cleanup);

describe("useKeybindings", () => {
	it("Escape deselects", () => {
		setup([makeLayer("a")], "a");
		press({ key: "Escape" });
		expect(ref.ctx?.state.selectedLayers).toEqual([]);
	});

	it("duplicates with new ids throughout the subtree", () => {
		setup([makeLayer("a", [makeLayer("child")])], "a");
		press({ key: "d", metaKey: true });
		expect(layers()).toHaveLength(2);
		expect(layers()[1].id).not.toBe("a");
		expect(layers()[1].children?.[0].id).not.toBe("child");
		expect(ref.ctx?.state.selectedLayers).toEqual([layers()[1].id]);
	});

	it("adds a layer after the selection with its shortcut", () => {
		setup([makeLayer("a"), makeLayer("b")], "a");
		press({ key: "t" });
		expect(layers().map((l) => l.type)).toEqual(["frame", "text", "frame"]);
	});

	it("leaves browser shortcuts alone", () => {
		setup([makeLayer("a")], "a");
		press({ key: "t", metaKey: true });
		expect(layers()).toHaveLength(1);
	});

	it("nudges positioned layers and ignores layers in flow", () => {
		setup(
			[makeLayer("a", undefined, { cssVars: { position: "absolute" } })],
			"a"
		);
		press({ key: "ArrowRight", shiftKey: true });
		expect(layers()[0].cssVars?.left).toBe("10px");
		cleanup();
		setup([makeLayer("b")], "b");
		press({ key: "ArrowRight" });
		expect(layers()[0].cssVars?.left).toBeUndefined();
	});

	it("ignores letters while a panel control has focus", () => {
		setup(
			[makeLayer("a", undefined, { type: "text" })],
			"a",
			<ActionTextAlign />
		);
		const button = document.querySelector("button") as HTMLButtonElement;
		fireEvent.keyDown(button, { key: "t" });
		expect(layers()).toHaveLength(1);
	});

	it("shows a toggle's value at the active breakpoint", () => {
		setup(
			[makeLayer("a", undefined, { type: "text" })],
			"a",
			<ActionTextAlign />
		);
		act(() => {
			ref.ctx?.dispatch({
				type: "SET_ACTIVE_BREAKPOINT",
				payload: { breakpointId: "desktop" },
			});
		});
		act(() => {
			dispatch({
				type: "UPDATE_LAYER_CSS",
				payload: { id: "a", css: { "--text-align": "center" } },
			});
		});
		const center = document.querySelector("[aria-label=Center]");
		expect(center?.getAttribute("aria-pressed")).toBe("true");
		expect(layers()[0].cssVars?.["--text-align"]).toBeUndefined();
	});
});
