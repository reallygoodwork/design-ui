import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DesignerProvider } from "../../context/DesignerContext";
import { useDesignerContext } from "../../hooks/useDesignerContext";
import { TokensProvider } from "../../hooks/useTokens";
import type { Token } from "../../lib/tokens";
import { breakpoints, defaultLayerTypes, makeLayer } from "../../test/fixtures";
import { TokensPane } from "./TokensPane";

const tokens: Token[] = [
	{
		path: "color.neutral.0",
		type: "color",
		tier: "primitive",
		value: "#ffffff",
	},
	{
		path: "color.bg.page",
		type: "color",
		tier: "semantic",
		value: "{color.neutral.0}",
	},
];

const ref: {
	ctx: ReturnType<typeof useDesignerContext> | null;
	tokens: readonly Token[];
} = {
	ctx: null,
	tokens,
};
const Capture = () => {
	ref.ctx = useDesignerContext();
	return null;
};

const setup = () => {
	ref.tokens = tokens;
	render(
		<DesignerProvider
			defaultLayers={[
				makeLayer("L", undefined, {
					cssVars: { "--background-color": "var(--color-bg-page)" },
				}),
			]}
			defaultLayerTypes={defaultLayerTypes}
			breakpoints={breakpoints}
		>
			<TokensProvider
				tokens={tokens}
				dimensions={{ theme: ["light", "dark"] }}
				onTokensChange={(next) => {
					ref.tokens = next;
				}}
			>
				<Capture />
				<TokensPane />
			</TokensProvider>
		</DesignerProvider>
	);
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(cleanup);

describe("TokensPane", () => {
	it("creates a token", async () => {
		const user = userEvent.setup();
		setup();
		await user.click(screen.getByRole("button", { name: "New token" }));
		const form = screen.getByRole("form", { name: "New token" });
		const name = within(form).getByRole("textbox", { name: "Name" });
		await user.clear(name);
		await user.type(name, "color.text.primary");
		const value = within(form).getByRole("textbox", { name: "Value" });
		await user.type(value, "#18181b");
		fireEvent.blur(value);
		await user.click(within(form).getByRole("button", { name: "Create" }));
		await flush();
		expect(ref.tokens.at(-1)).toMatchObject({
			path: "color.text.primary",
			type: "color",
			value: "#18181b",
		});
	});

	it("renames a token and the layers that use it", async () => {
		const user = userEvent.setup();
		setup();
		await user.click(screen.getByRole("button", { name: /bg\.page/ }));
		const name = screen.getByRole("textbox", { name: "Token name" });
		await user.clear(name);
		await user.type(name, "color.surface.page{Enter}");
		await flush();
		expect(ref.tokens.some((t) => t.path === "color.surface.page")).toBe(true);
		expect(ref.ctx?.state.layers[0].cssVars?.["--background-color"]).toBe(
			"var(--color-surface-page)"
		);
	});

	it("adds a value for a mode", async () => {
		const user = userEvent.setup();
		setup();
		await user.click(screen.getByRole("button", { name: /bg\.page/ }));
		await user.click(
			screen.getByRole("combobox", { name: "Add a value for a mode" })
		);
		await user.click(
			await screen.findByRole("option", { name: "theme: dark" })
		);
		await flush();
		expect(ref.tokens.find((t) => t.path === "color.bg.page")?.modes).toEqual([
			{ when: { theme: "dark" }, value: "{color.neutral.0}" },
		]);
	});

	it("imports variables from pasted CSS", async () => {
		const user = userEvent.setup();
		setup();
		await user.click(
			screen.getByRole("button", { name: "Import CSS variables" })
		);
		fireEvent.change(screen.getByRole("textbox", { name: "CSS" }), {
			target: {
				value: ":root { --brand-red: #f2545b; --color-neutral-0: #ffffff; }",
			},
		});
		expect(screen.getByText("Already a token color.neutral.0")).toBeTruthy();
		await user.click(screen.getByRole("button", { name: "Import 1 token" }));
		await flush();
		expect(ref.tokens.at(-1)).toMatchObject({
			path: "brand.red",
			type: "color",
			value: "#f2545b",
		});
	});
});
