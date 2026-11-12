import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DesignerProvider } from "../../context/DesignerContext";
import { TokensProvider } from "../../hooks/useTokens";
import type { Token } from "../../lib/tokens";
import { breakpoints, defaultLayerTypes } from "../../test/fixtures";
import { TokenComposer } from "./TokenComposer";

const tokens: Token[] = [
	{ path: "brand", type: "color", tier: "primitive", value: "#f2545b" },
	{ path: "muted", type: "number", tier: "primitive", value: "0.5" },
];

// jsdom has no CSS.supports; accept anything without braces left in it.
vi.stubGlobal("CSS", {
	supports: (_: string, value: string) => !value.includes("{"),
});

const setup = (value = "") => {
	const onApply = vi.fn();
	render(
		<DesignerProvider
			defaultLayers={[]}
			defaultLayerTypes={defaultLayerTypes}
			breakpoints={breakpoints}
		>
			<TokensProvider tokens={tokens}>
				<TokenComposer
					type="color"
					value={value}
					exclude="faded"
					onApply={onApply}
				/>
			</TokensProvider>
		</DesignerProvider>
	);
	return onApply;
};

afterEach(cleanup);

describe("TokenComposer", () => {
	it("builds a value from a function's slots and previews it", async () => {
		const user = userEvent.setup();
		const onApply = setup();
		const color = screen.getByRole("textbox", {
			name: "Mix two colors: Color",
		});
		await user.type(color, "{{brand}");
		expect(
			screen.getByText("color-mix(in oklch, #f2545b 50%, white)")
		).toBeTruthy();
		await user.click(screen.getByRole("button", { name: "Use this value" }));
		expect(onApply).toHaveBeenCalledWith(
			"color-mix(in oklch, {brand} 50%, white)"
		);
	});

	it("takes a free expression that mixes token types", async () => {
		const user = userEvent.setup();
		const onApply = setup("oklch(from {brand} l c h / {muted})");
		expect(
			screen
				.getByRole("tab", { name: "expression" })
				.getAttribute("aria-selected")
		).toBe("true");
		expect(screen.getByText("oklch(from #f2545b l c h / 0.5)")).toBeTruthy();
		await user.click(screen.getByRole("button", { name: "Use this value" }));
		expect(onApply).toHaveBeenCalledWith("oklch(from {brand} l c h / {muted})");
	});

	it("won't use a token that doesn't exist or reads itself", () => {
		setup();
		fireEvent.click(screen.getByRole("tab", { name: "expression" }));
		fireEvent.change(screen.getByRole("textbox", { name: "Expression" }), {
			target: { value: "color-mix(in oklch, {nope} 50%, white)" },
		});
		expect(screen.getByText("{nope} isn't a token")).toBeTruthy();
		fireEvent.change(screen.getByRole("textbox", { name: "Expression" }), {
			target: { value: "color-mix(in oklch, {faded} 50%, white)" },
		});
		expect(
			screen
				.getByRole("button", { name: "Use this value" })
				.hasAttribute("disabled")
		).toBe(true);
	});
});
