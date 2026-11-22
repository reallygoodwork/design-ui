import { act, cleanup } from "@testing-library/react";
import { Profiler, useEffect } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { makeLayer, renderInDesigner } from "../test/fixtures";
import { useDesignerAction } from "./useDesignerAction";
import { useDesignerSelector } from "./useDesignerSelector";

afterEach(cleanup);

let dispatch: ReturnType<typeof useDesignerAction>;
const Dispatcher = () => {
	const action = useDesignerAction();
	useEffect(() => {
		dispatch = action;
	}, [action]);
	return null;
};

const probe = () => {
	const counts = { commits: 0 };
	return {
		counts,
		onRender: () => {
			counts.commits += 1;
		},
	};
};

let lengthSeen: number | undefined;
const LengthReader = () => {
	lengthSeen = useDesignerSelector((s) => s.layers.length);
	return null;
};

let zoomSeen = 0;
const ZoomReader = () => {
	zoomSeen = useDesignerSelector((s) => s.zoom);
	return null;
};

const CountReader = () => {
	useDesignerSelector(
		(s) => ({ n: s.layers.length }),
		(a, b) => a.n === b.n
	);
	return null;
};

const IdsReader = () => {
	useDesignerSelector(
		(s) => ({ ids: s.layers.map((l) => l.id) }),
		(a, b) => a.ids.join() === b.ids.join()
	);
	return null;
};

describe("useDesignerSelector", () => {
	it("returns the selected slice", () => {
		renderInDesigner(<LengthReader />, {
			layers: [makeLayer("a"), makeLayer("b")],
		});
		expect(lengthSeen).toBe(2);
	});

	it("re-renders when its slice changes but not when another slice does", () => {
		const p = probe();
		renderInDesigner(
			<>
				<Dispatcher />
				<Profiler id="p" onRender={p.onRender}>
					<ZoomReader />
				</Profiler>
			</>,
			{ layers: [makeLayer("a")] }
		);
		const before = p.counts.commits;
		act(() => {
			dispatch({
				type: "UPDATE_LAYER_CSS",
				payload: { id: "a", css: { color: "red" } },
			});
		});
		expect(p.counts.commits - before).toBe(0);
		act(() => {
			dispatch({ type: "SET_ZOOM", payload: 2 });
		});
		expect(p.counts.commits - before).toBe(1);
		expect(zoomSeen).toBe(2);
	});

	it("a custom isEqual prevents re-renders for equal derived values", () => {
		const p = probe();
		renderInDesigner(
			<>
				<Dispatcher />
				<Profiler id="p" onRender={p.onRender}>
					<CountReader />
				</Profiler>
			</>,
			{ layers: [makeLayer("a")] }
		);
		const before = p.counts.commits;
		act(() => {
			dispatch({ type: "SET_ZOOM", payload: 2 });
		});
		act(() => {
			dispatch({
				type: "UPDATE_LAYER_CSS",
				payload: { id: "a", css: { color: "red" } },
			});
		});
		expect(p.counts.commits - before).toBe(0);
	});

	it("does not loop with a selector that returns a new object each call", () => {
		const p = probe();
		renderInDesigner(
			<Profiler id="p" onRender={p.onRender}>
				<IdsReader />
			</Profiler>,
			{ layers: [makeLayer("a")] }
		);
		expect(p.counts.commits).toBeLessThan(5);
	});
});
