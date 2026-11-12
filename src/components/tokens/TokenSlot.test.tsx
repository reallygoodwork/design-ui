import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { DesignerProvider } from "../../context/DesignerContext";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useDesignerContext } from "../../hooks/useDesignerContext";
import { TokensProvider } from "../../hooks/useTokens";
import type { Token } from "../../lib/tokens";
import { breakpoints, defaultLayerTypes, makeLayer } from "../../test/fixtures";
import { ActionFontWeight } from "../actions/ActionFontWeight";
import { ActionOpacity } from "../actions/ActionOpacity";
import { ActionPadding } from "../actions/ActionPadding";
import { ActionSize } from "../actions/ActionSize";
import { BoxModel } from "../actions/BoxModel";

const tokens: Token[] = [
	{ path: "space.4", type: "dimension", tier: "primitive", value: "16px" },
	{
		path: "font.size.body",
		type: "dimension",
		tier: "primitive",
		value: "18px",
	},
	{
		path: "space.stack",
		type: "dimension",
		tier: "semantic",
		value: "{space.4}",
	},
	{ path: "weight.bold", type: "fontWeight", tier: "primitive", value: "700" },
	{ path: "opacity.muted", type: "number", tier: "primitive", value: "0.6" },
];

const ref: {
	ctx: ReturnType<typeof useDesignerContext> | null;
	dispatch: ReturnType<typeof useDesignerAction> | null;
} = { ctx: null, dispatch: null };
const Capture = () => {
	ref.ctx = useDesignerContext();
	ref.dispatch = useDesignerAction();
	return null;
};

const setup = (ui: ReactNode, cssVars: Record<string, string> = {}) => {
	render(
		<DesignerProvider
			defaultLayers={[makeLayer("L", undefined, { cssVars })]}
			defaultLayerTypes={defaultLayerTypes}
			breakpoints={breakpoints}
		>
			<TokensProvider tokens={tokens}>
				<Capture />
				{ui}
			</TokensProvider>
		</DesignerProvider>
	);
	act(() => {
		ref.dispatch?.({
			type: "SELECT_LAYER",
			payload: { layerId: "L", shiftKey: false, breakpointId: "mobile" },
		});
	});
};

const css = () => ref.ctx?.state.layers[0].cssVars ?? {};
const SIDES = [
	"--padding-block-start",
	"--padding-inline-end",
	"--padding-block-end",
	"--padding-inline-start",
];

afterEach(cleanup);

describe("token slots across controls", () => {
	it("lists spacing tokens first for padding", async () => {
		const user = userEvent.setup();
		setup(<ActionPadding />);
		await user.click(
			screen.getByRole("button", { name: "Use a token for Padding" })
		);
		const sections = screen
			.getAllByRole("region")
			.map((r) => r.getAttribute("aria-label"));
		expect(sections.slice(0, 2)).toEqual(["Spacing", "Other primitives"]);
		const spacing =
			screen.getByRole("region", { name: "Spacing" }).textContent ?? "";
		expect(spacing).toContain("space.stack");
		expect(spacing).not.toContain("font.size.body");
	});

	it("applies one token to every padding side, then shows it", async () => {
		const user = userEvent.setup();
		setup(<ActionPadding />);
		await user.click(
			screen.getByRole("button", { name: "Use a token for Padding" })
		);
		await user.click(screen.getByRole("button", { name: /space\.stack/ }));
		for (const side of SIDES) expect(css()[side]).toBe("var(--space-stack)");
		expect(
			screen.getByRole("button", { name: "Padding: space.stack" })
		).toBeTruthy();
	});

	it("shows a token on one side when the sides differ", () => {
		setup(<ActionPadding />, {
			"--padding-block-start": "var(--space-4)",
			"--padding-inline-end": "8px",
		});
		expect(screen.getByRole("button", { name: "Top: space.4" })).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Use a token for Right" })
		).toBeTruthy();
	});

	it("gives width a token", async () => {
		const user = userEvent.setup();
		setup(<ActionSize />);
		await user.click(
			screen.getByRole("button", { name: "Use a token for Width" })
		);
		await user.click(screen.getByRole("button", { name: /space\.4/ }));
		expect(css()["--width"]).toBe("var(--space-4)");
	});

	it("offers weight tokens on the weight select, and number tokens on opacity", async () => {
		const user = userEvent.setup();
		setup(
			<>
				<ActionFontWeight />
				<ActionOpacity />
			</>
		);
		await user.click(
			screen.getByRole("button", { name: "Use a token for Weight" })
		);
		expect(screen.queryByRole("button", { name: /space\.4/ })).toBeNull();
		await user.click(screen.getByRole("button", { name: /weight\.bold/ }));
		expect(css()["--font-weight"]).toBe("var(--weight-bold)");

		await user.click(
			screen.getByRole("button", { name: "Use a token for Opacity" })
		);
		await user.click(screen.getByRole("button", { name: /opacity\.muted/ }));
		expect(css()["--opacity"]).toBe("var(--opacity-muted)");
	});

	it("box model: picks where, then which token, and lists what's in use", async () => {
		const user = userEvent.setup();
		setup(<BoxModel />);
		await user.click(screen.getByRole("button", { name: "Use a token…" }));
		// Padding and all sides are the defaults; narrow it to left and right.
		await user.click(screen.getByRole("button", { name: "Left & right" }));
		await user.click(screen.getByRole("button", { name: /space\.stack/ }));
		expect(css()["--padding-inline-start"]).toBe("var(--space-stack)");
		expect(css()["--padding-inline-end"]).toBe("var(--space-stack)");
		expect(css()["--padding-block-start"]).toBeUndefined();

		// The diagram shows the value, marked as a token; the list names it.
		expect(
			screen.getByRole("button", { name: "Padding left: space.stack, 16px" })
		).toBeTruthy();
		const list = screen.getByRole("list", {
			name: "Tokens on padding and margin",
		});
		expect(list.textContent).toContain("space.stackPadding left & right");

		// Detaching keeps the value.
		await user.click(
			screen.getByRole("button", {
				name: "Stop using space.stack for padding left & right",
			})
		);
		expect(css()["--padding-inline-start"]).toBe("16px");
		expect(
			screen.queryByRole("list", { name: "Tokens on padding and margin" })
		).toBeNull();
	});

	it("box model: typing { in a side opens that side's tokens", async () => {
		setup(<BoxModel />);
		fireEvent.keyDown(screen.getByRole("textbox", { name: "Margin left" }), {
			key: "{",
		});
		expect(
			await screen.findByRole("dialog", { name: "Margin left" })
		).toBeTruthy();
	});
});
