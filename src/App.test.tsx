import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

afterEach(cleanup);

describe("App smoke test", () => {
	it("mounts the real tree (real Moveable and ables) with nothing selected", () => {
		expect(() => render(<App />)).not.toThrow();
		expect(
			document.querySelector("[data-slot='designer-canvas']")
		).not.toBeNull();
	});
});
