import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StructureAble } from "./StructureAble";

const Viewer = ({ children }: { children?: ReactNode }) => (
	<div>{children}</div>
);

const fakeMoveable = (targets: unknown[], onOpen = vi.fn()) =>
	({
		props: { supportsChildren: true, onOpenAddLayerDialog: onOpen },
		getRect: () => ({ height: 40 }),
		state: { pos2: [100, 20] },
		getTargets: () => targets,
		useCSS: () => Viewer,
	}) as never;

const renderAble = (m: never) =>
	render(
		(StructureAble.render as (m: never, r: never) => ReactNode)(m, {} as never)
	);

afterEach(cleanup);

describe("StructureAble.render", () => {
	it("does not throw with no targets (nothing selected)", () => {
		expect(() => renderAble(fakeMoveable([]))).not.toThrow();
	});

	it("does not open the dialog without a target", () => {
		const onOpen = vi.fn();
		const { getByTitle } = renderAble(fakeMoveable([], onOpen));
		getByTitle("Add element before").click();
		expect(onOpen).not.toHaveBeenCalled();
	});

	it("resolves the layer id from an element target", () => {
		const layer = document.createElement("div");
		layer.setAttribute("data-layer-id", "a");
		const inner = document.createElement("span");
		layer.appendChild(inner);
		const onOpen = vi.fn();
		const { getByTitle } = renderAble(fakeMoveable([inner], onOpen));
		getByTitle("Add element after").click();
		expect(onOpen).toHaveBeenCalledWith({ layerId: "a", position: "after" });
	});
});
