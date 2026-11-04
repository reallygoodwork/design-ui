import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DesignerProvider } from "../context/DesignerContext";
import { useDesignerContext } from "../hooks/useDesignerContext";
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

let dispatchFrame: (font: string) => void;
const Capture = () => {
	const { dispatch } = useDesignerContext();
	dispatchFrame = (font) =>
		dispatch({
			type: "UPDATE_FRAME_STYLES",
			payload: { css: { "--font-family": font } },
		});
	return null;
};

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

	describe("frame font handling", () => {
		const setup = (layers = [makeLayer("F")]) =>
			render(
				<DesignerProvider
					defaultLayers={layers}
					defaultLayerTypes={defaultLayerTypes}
					breakpoints={breakpoints}
				>
					<Capture />
					<FontLoader />
				</DesignerProvider>
			);
		const loaded = () => loadFont.mock.calls.map((c) => c[0]);

		afterEach(() => {
			vi.useRealTimers();
		});

		it("debounces typing the frame font into a single load", () => {
			vi.useFakeTimers();
			setup();
			const word = "Georgia";
			for (let i = 1; i <= word.length; i++) {
				act(() => dispatchFrame(word.slice(0, i)));
				act(() => {
					vi.advanceTimersByTime(50);
				});
			}
			expect(loaded()).toEqual([]);
			act(() => {
				vi.advanceTimersByTime(400);
			});
			expect(loaded()).toEqual(["Georgia"]);
		});

		it.each([
			["Inter, system-ui", ["Inter"]],
			['"Open Sans", serif', ["Open Sans"]],
			["system-ui", []],
		])("frame font %s loads %j", (value, expected) => {
			vi.useFakeTimers();
			setup();
			act(() => dispatchFrame(value));
			act(() => {
				vi.advanceTimersByTime(400);
			});
			expect(loaded()).toEqual(expected);
		});

		it("loads layer and breakpoint-override fonts without a timer", () => {
			vi.useFakeTimers();
			setup([
				makeLayer("F", [
					makeLayer("T", undefined, {
						type: "text",
						cssVars: { "--font-family": "Lato, sans-serif" },
						breakpointCssVars: { tablet: { "--font-family": "Roboto" } },
					}),
				]),
			]);
			expect(loaded()).toEqual(expect.arrayContaining(["Lato", "Roboto"]));
		});
	});
});
