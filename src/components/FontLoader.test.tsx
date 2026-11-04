import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DesignerProvider } from "../context/DesignerContext";
import { breakpoints, defaultLayerTypes, makeLayer } from "../test/fixtures";
import { FontLoader } from "./FontLoader";

const loadFont = vi.fn();
vi.mock("../hooks/useGoogleFonts", () => ({
	useGoogleFonts: () => ({ loadFont }),
}));

afterEach(() => {
	cleanup();
	loadFont.mockClear();
});

describe("FontLoader", () => {
	it("loads base, breakpoint-override and frame fonts without interaction", () => {
		render(
			<DesignerProvider
				defaultLayers={[
					makeLayer("F", [
						makeLayer("T", undefined, {
							type: "text",
							cssVars: { "--font-family": "Lato" },
							breakpointCssVars: {
								tablet: { "--font-family": "Roboto" },
							},
						}),
					]),
				]}
				defaultLayerTypes={defaultLayerTypes}
				breakpoints={breakpoints}
				frameStyles={{ "--font-family": "Oswald" }}
			>
				<FontLoader />
			</DesignerProvider>
		);
		const loaded = loadFont.mock.calls.map((c) => c[0]);
		expect(loaded).toEqual(
			expect.arrayContaining(["Lato", "Roboto", "Oswald"])
		);
	});
});
