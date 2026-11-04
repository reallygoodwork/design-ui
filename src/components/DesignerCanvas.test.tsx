import { describe, expect, it, vi } from "vitest";
import { makeLayer, renderInDesigner } from "../test/fixtures";
import { DesignerCanvas } from "./DesignerCanvas";

const moveableProps = vi.hoisted(() => ({
	current: null as Record<string, unknown> | null,
}));

vi.mock("react-moveable", async () => {
	const React = await import("react");
	return {
		default: React.forwardRef((props: Record<string, unknown>, _ref) => {
			moveableProps.current = props;
			return null;
		}),
	};
});

vi.mock("react-selecto", async () => {
	const React = await import("react");
	return { default: React.forwardRef(() => null) };
});

vi.mock("react-infinite-viewer", async () => {
	const React = await import("react");
	return {
		default: React.forwardRef(
			({ children }: { children?: React.ReactNode }, _ref) => (
				<div>{children}</div>
			)
		),
	};
});

describe("drag disabled", () => {
	it("passes draggable false and no onDrag to Moveable", () => {
		renderInDesigner(
			<DesignerCanvas>
				<div />
			</DesignerCanvas>,
			{ layers: [makeLayer("a")] }
		);
		const props = moveableProps.current;
		expect(props).not.toBeNull();
		expect(props?.draggable).toBe(false);
		expect(props).not.toHaveProperty("onDrag");
	});

	it("keeps the custom ables and their props", () => {
		renderInDesigner(
			<DesignerCanvas>
				<div />
			</DesignerCanvas>
		);
		const props = moveableProps.current;
		expect(props?.ables).toHaveLength(2);
		expect(props?.props).toMatchObject({
			dimensionViewable: true,
			structureViewable: true,
		});
	});
});
