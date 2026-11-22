import type { Token } from "@design-ui/core";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DesignerProvider } from "../../context/DesignerContext";
import { useDesignerAction } from "../../hooks/useDesignerAction";
import { useDesignerContext } from "../../hooks/useDesignerContext";
import { TokensProvider } from "../../hooks/useTokens";
import { breakpoints, defaultLayerTypes, makeLayer } from "../../test/fixtures";
import { ActionBackgroundColor } from "../actions/ActionBackgroundColor";
import { ActionFontSize } from "../actions/ActionFontSize";

const tokens: Token[] = [
	{
		path: "color.neutral.0",
		type: "color",
		tier: "primitive",
		value: "#ffffff",
	},
	{
		path: "color.neutral.950",
		type: "color",
		tier: "primitive",
		value: "#0c0c0e",
	},
	{
		path: "color.bg.page",
		type: "color",
		tier: "semantic",
		value: "{color.neutral.0}",
		modes: [{ when: { theme: "dark" }, value: "{color.neutral.950}" }],
	},
	{
		path: "font.size.body",
		type: "dimension",
		tier: "semantic",
		value: "18px",
	},
];

const ref: {
	ctx: ReturnType<typeof useDesignerContext> | null;
	dispatch: ReturnType<typeof useDesignerAction> | null;
} = {
	ctx: null,
	dispatch: null,
};
const Capture = () => {
	ref.ctx = useDesignerContext();
	ref.dispatch = useDesignerAction();
	return null;
};

const setup = (ui: React.ReactNode, cssVars: Record<string, string>) => {
	render(
		<DesignerProvider
			defaultLayers={[makeLayer("L", undefined, { cssVars })]}
			defaultLayerTypes={defaultLayerTypes}
			breakpoints={breakpoints}
		>
			<TokensProvider tokens={tokens} dimensions={{ theme: ["light", "dark"] }}>
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

afterEach(cleanup);

describe("token picking in value popovers", () => {
	it("opens on Tokens when the raw value matches one, and applies it as var()", async () => {
		const user = userEvent.setup();
		setup(<ActionBackgroundColor />, { "--background-color": "#ffffff" });
		await user.click(screen.getByRole("button", { name: /#ffffff/i }));

		expect(
			screen.getByRole("tab", { name: "tokens" }).getAttribute("aria-selected")
		).toBe("true");
		// Only color tokens are offered.
		expect(screen.queryByText("font.size.body")).toBeNull();

		await user.click(screen.getByRole("button", { name: /color\.bg\.page/ }));
		expect(css()["--background-color"]).toBe("var(--color-bg-page)");
	});

	it("shows the token on the trigger and detaches to its value", async () => {
		const user = userEvent.setup();
		setup(<ActionBackgroundColor />, {
			"--background-color": "var(--color-bg-page)",
		});
		const trigger = screen.getByRole("button", { name: /color\.bg\.page/ });
		await user.click(trigger);
		await user.click(screen.getByRole("button", { name: /detach/i }));
		expect(css()["--background-color"]).toBe("#ffffff");
	});

	it("offers size tokens on number fields", async () => {
		const user = userEvent.setup();
		setup(<ActionFontSize />, { "--font-size": "16px" });
		await user.click(screen.getByRole("button", { name: /use a token/i }));
		await user.click(screen.getByRole("button", { name: /font\.size\.body/ }));
		expect(css()["--font-size"]).toBe("var(--font-size-body)");
	});
});
