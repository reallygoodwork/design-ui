import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { DesignerProvider } from "../../context/DesignerContext";
import { TokensProvider, useTokens } from "../../hooks/useTokens";
import type { Token, TokenDimensions } from "../../lib/tokens";
import { breakpoints, defaultLayerTypes } from "../../test/fixtures";
import { TokenTable } from "./TokenTable";

const tokens: Token[] = [
	{
		path: "color.bg.page",
		type: "color",
		tier: "semantic",
		value: "#ffffff",
		modes: [{ when: { theme: "dark" }, value: "#000000" }],
	},
];

const state: { tokens: readonly Token[]; dimensions: TokenDimensions } = {
	tokens,
	dimensions: {},
};

const Open = () => {
	const { setTableOpen } = useTokens();
	useEffect(() => setTableOpen(true), [setTableOpen]);
	return null;
};

const setup = () => {
	state.tokens = tokens;
	state.dimensions = { theme: ["light", "dark"] };
	render(
		<DesignerProvider
			defaultLayers={[]}
			defaultLayerTypes={defaultLayerTypes}
			breakpoints={breakpoints}
		>
			<TokensProvider
				tokens={tokens}
				dimensions={state.dimensions}
				onTokensChange={(next) => {
					state.tokens = next;
				}}
				onDimensionsChange={(next) => {
					state.dimensions = next;
				}}
			>
				<Open />
				<TokenTable />
			</TokensProvider>
		</DesignerProvider>
	);
};

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

afterEach(cleanup);

describe("TokenTable", () => {
	it("shows a column per theme with each token's value", () => {
		setup();
		expect(screen.getByRole("columnheader", { name: /light/ })).toBeTruthy();
		expect(
			(
				screen.getByRole("textbox", {
					name: "color.bg.page dark",
				}) as HTMLInputElement
			).value
		).toBe("#000000");
	});

	it("adds a theme and gives a token a value in it", async () => {
		const user = userEvent.setup();
		setup();
		await user.click(screen.getByRole("button", { name: "Add theme" }));
		await user.type(
			screen.getByRole("textbox", { name: "New theme" }),
			"dim{Enter}"
		);
		await flush();
		expect(state.dimensions.theme).toEqual(["light", "dark", "dim"]);

		const cell = screen.getByRole("textbox", { name: "color.bg.page dim" });
		await user.type(cell, "#222222{Enter}");
		await flush();
		expect(state.tokens[0].modes).toContainEqual({
			when: { theme: "dim" },
			value: "#222222",
		});
	});

	it("renames a theme in the tokens that use it", async () => {
		const user = userEvent.setup();
		setup();
		fireEvent.doubleClick(screen.getByRole("button", { name: "dark" }));
		const input = screen.getByRole("textbox", { name: "Rename dark" });
		await user.clear(input);
		await user.type(input, "night{Enter}");
		await flush();
		expect(state.dimensions.theme).toEqual(["light", "night"]);
		expect(state.tokens[0].modes).toEqual([
			{ when: { theme: "night" }, value: "#000000" },
		]);
	});

	it("emptying a cell drops that mode's value", async () => {
		const user = userEvent.setup();
		setup();
		await user.clear(
			screen.getByRole("textbox", { name: "color.bg.page dark" })
		);
		fireEvent.blur(screen.getByRole("textbox", { name: "color.bg.page dark" }));
		await flush();
		expect(state.tokens[0].modes).toBeUndefined();
	});

	it("adds a new mode set", async () => {
		const user = userEvent.setup();
		setup();
		await user.click(screen.getByRole("button", { name: "Mode set" }));
		await user.type(
			screen.getByRole("textbox", { name: "New mode set name" }),
			"contrast{Enter}"
		);
		await user.type(
			screen.getByRole("textbox", { name: "New contrast" }),
			"high{Enter}"
		);
		await flush();
		expect(state.dimensions.contrast).toEqual(["default", "high"]);
	});
});

describe("TokenTable drawer", () => {
	const panel = () =>
		screen.getByRole("region", { name: "Token table" }) as HTMLElement;

	it("toggles full view from the button and the handle", async () => {
		const user = userEvent.setup();
		setup();
		await user.click(screen.getByRole("button", { name: "Full view" }));
		expect(panel().style.height).toBe("100%");
		await user.click(screen.getByRole("button", { name: "Show the canvas" }));
		expect(panel().style.height).not.toBe("100%");

		const handle = screen.getByRole("separator", {
			name: "Resize token panel",
		});
		fireEvent.doubleClick(handle);
		expect(panel().style.height).toBe("100%");
		fireEvent.keyDown(handle, { key: "Enter" });
		expect(panel().style.height).not.toBe("100%");
	});

	it("steps its height with the arrow keys", () => {
		setup();
		const handle = screen.getByRole("separator", {
			name: "Resize token panel",
		});
		// jsdom has no layout; give the column a height to resize within.
		Object.defineProperty(
			panel().parentElement as HTMLElement,
			"clientHeight",
			{ value: 800, configurable: true }
		);
		const before = Number.parseFloat(panel().style.height);
		fireEvent.keyDown(handle, { key: "ArrowUp" });
		expect(Number.parseFloat(panel().style.height)).toBe(before + 40);
		fireEvent.keyDown(handle, { key: "End" });
		expect(panel().style.height).toBe("160px");
		fireEvent.keyDown(handle, { key: "Home" });
		expect(panel().style.height).toBe("100%");
	});
});
