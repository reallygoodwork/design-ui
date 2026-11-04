import { act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { breakpoints, makeLayer, renderInDesigner } from "../test/fixtures";
import { BreakpointFrame } from "./BreakpointFrame";

type Dispatch = ReturnType<typeof useDesignerContext>["dispatch"];

const Frames = ({ onDispatch }: { onDispatch?: (d: Dispatch) => void }) => {
	const { dispatch } = useDesignerContext();
	onDispatch?.(dispatch);
	return (
		<>
			{breakpoints.map((bp) => (
				<BreakpointFrame
					key={bp.id}
					breakpoint={bp}
					isActive={false}
					isSelected={false}
				/>
			))}
		</>
	);
};

const find = (container: HTMLElement, bp: string, id: string) =>
	container.querySelector(
		`.breakpoint-frame[data-breakpoint-id="${bp}"] [data-layer-id="${id}"]`
	) as HTMLElement;

const textLayer = makeLayer("t", undefined, {
	type: "text",
	value: "Hello",
	elementType: "p",
	cssVars: { "--font-size": "16px" },
	breakpointCssVars: { tablet: { "--font-size": "24px" } },
});

const fontSize = (container: HTMLElement, bp: string, id: string) =>
	(find(container, bp, id).firstElementChild as HTMLElement).style.fontSize;

describe("breakpoint overrides", () => {
	it("renders base on mobile and the override on tablet", () => {
		const { container } = renderInDesigner(<Frames />, { layers: [textLayer] });
		expect(fontSize(container, "mobile", "t")).toBe("16px");
		expect(fontSize(container, "tablet", "t")).toBe("24px");
	});

	it("desktop inherits the tablet override", () => {
		const { container } = renderInDesigner(<Frames />, { layers: [textLayer] });
		expect(fontSize(container, "desktop", "t")).toBe("24px");
	});

	it("clearing the tablet override restores 16px", () => {
		let dispatch: Dispatch | undefined;
		const { container } = renderInDesigner(
			<Frames onDispatch={(d) => (dispatch = d)} />,
			{ layers: [textLayer] }
		);
		expect(fontSize(container, "tablet", "t")).toBe("24px");
		act(() => {
			dispatch?.({
				type: "UPDATE_LAYER_CSS",
				payload: {
					id: "t",
					css: { "--font-size": "" },
					breakpointId: "tablet",
				},
			});
		});
		expect(fontSize(container, "tablet", "t")).toBe("16px");
		expect(fontSize(container, "desktop", "t")).toBe("16px");
	});

	it("applies overrides to non-text layers (image --width)", () => {
		const image = makeLayer("i", undefined, {
			type: "image",
			value: "x.png",
			cssVars: { "--width": "100px" },
			breakpointCssVars: { tablet: { "--width": "300px" } },
		});
		const { container } = renderInDesigner(<Frames />, { layers: [image] });
		const width = (bp: string) =>
			(find(container, bp, "i").querySelector("img") as HTMLElement).style
				.width;
		expect(width("mobile")).toBe("100px");
		expect(width("tablet")).toBe("300px");
		expect(width("desktop")).toBe("300px");
	});
});
