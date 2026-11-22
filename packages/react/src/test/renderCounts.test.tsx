import { act, cleanup, render } from "@testing-library/react";
import { Profiler, useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BreakpointFrame } from "../components/BreakpointFrame";
import { DesignerCanvas } from "../components/DesignerCanvas";
import { PaneLayerTree } from "../components/PaneLayerTree";
import { ZoomControl } from "../components/ZoomControl";
import { DesignerProvider } from "../context/DesignerContext";
import { useDesignerAction } from "../hooks/useDesignerAction";
import { useDesignerContext } from "../hooks/useDesignerContext";
import { useHistory } from "../hooks/useHistory";
import { useKeybindings } from "../hooks/useKeybindings";
import { useLayers } from "../hooks/useLayers";
import { useSelectedLayers } from "../hooks/useSelectedLayers";
import { useZoom } from "../hooks/useZoom";
import type { Layer, LayerType } from "../lib/Types";
import {
	breakpoints,
	defaultLayerTypes,
	makeLayer,
	renderInDesigner,
} from "./fixtures";

const viewerProps = vi.hoisted(() => ({
	current: null as Record<string, unknown> | null,
}));

vi.mock("react-moveable", async () => {
	const React = await import("react");
	return {
		default: React.forwardRef((_props: Record<string, unknown>, ref) => {
			React.useImperativeHandle(ref, () => ({
				updateRect: () => {},
				getControlBoxElement: () => null,
			}));
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
			(
				props: Record<string, unknown> & { children?: React.ReactNode },
				_ref
			) => {
				viewerProps.current = props;
				return <div>{props.children}</div>;
			}
		),
	};
});

afterEach(cleanup);

type Dispatch = ReturnType<typeof useDesignerAction>;
let dispatch: Dispatch;
const Dispatcher = () => {
	const action = useDesignerAction();
	useEffect(() => {
		dispatch = action;
	}, [action]);
	return null;
};

/** Reads state, like a layer component does. */
const StateReader = () => {
	const { state } = useDesignerContext();
	return <span data-testid="reader">{state.layers.length}</span>;
};

const OnlyDispatch = () => {
	useDesignerAction();
	return null;
};

const Keys = () => {
	useKeybindings();
	return null;
};

const seen: unknown[] = [];
const Selected = () => {
	seen.push(useSelectedLayers());
	return null;
};

const LayerSliceReaders = () => {
	useLayers();
	useSelectedLayers();
	useHistory();
	return null;
};

const ZoomReader = () => {
	useZoom();
	return null;
};

let latest: ReturnType<typeof useLayers> = [];
const Capture = () => {
	latest = useLayers();
	return null;
};

const counter = () => {
	const counts = { commits: 0 };
	const onRender = () => {
		counts.commits += 1;
	};
	return { counts, onRender };
};

const unrelatedChange = (i: number) => {
	dispatch({
		type: "UPDATE_LAYER_CSS",
		payload: { id: "a", css: { color: `c${i}` } },
	});
};

describe("render counts", () => {
	it("a canvas scroll commits neither a layer subtree nor a state reader", () => {
		const layer = counter();
		const probe = counter();
		renderInDesigner(
			<DesignerCanvas>
				<Dispatcher />
				<Profiler id="layer" onRender={layer.onRender}>
					<StateReader />
				</Profiler>
				<Profiler id="probe" onRender={probe.onRender}>
					<StateReader />
				</Profiler>
			</DesignerCanvas>,
			{ layers: [makeLayer("a")] }
		);
		const onScroll = viewerProps.current?.onScroll as (e: unknown) => void;
		expect(onScroll).toBeTypeOf("function");
		const layerBefore = layer.counts.commits;
		const probeBefore = probe.counts.commits;
		act(() => {
			for (let i = 0; i < 10; i++) {
				onScroll({ scrollLeft: i * 10, scrollTop: i * 5 });
			}
		});
		expect(layer.counts.commits - layerBefore).toBe(0);
		expect(probe.counts.commits - probeBefore).toBe(0);
	});

	it("a dispatch-only component does not re-render on state changes", () => {
		const c = counter();
		renderInDesigner(
			<>
				<Dispatcher />
				<Profiler id="d" onRender={c.onRender}>
					<OnlyDispatch />
				</Profiler>
				<StateReader />
			</>,
			{ layers: [makeLayer("a")] }
		);
		const before = c.counts.commits;
		for (let i = 0; i < 5; i++) {
			act(() => {
				dispatch({ type: "SET_ZOOM", payload: 1 + (i + 1) / 10 });
			});
		}
		expect(c.counts.commits - before).toBe(0);
	});

	it("adds the keydown listeners once across 20 state changes", () => {
		const add = vi.spyOn(window, "addEventListener");
		const remove = vi.spyOn(window, "removeEventListener");
		renderInDesigner(
			<DesignerCanvas>
				<Dispatcher />
				<Keys />
			</DesignerCanvas>,
			{ layers: [makeLayer("a")] }
		);
		const keydownCalls = (spy: typeof add) =>
			spy.mock.calls.filter(([type]) => type === "keydown").length;
		const addedBefore = keydownCalls(add);
		const removedBefore = keydownCalls(remove);
		// DesignerCanvas and useKeybindings
		expect(addedBefore).toBe(2);
		for (let i = 0; i < 20; i++) {
			act(() => {
				unrelatedChange(i);
			});
		}
		expect(keydownCalls(add)).toBe(addedBefore);
		expect(keydownCalls(remove)).toBe(removedBefore);
		add.mockRestore();
		remove.mockRestore();
	});

	it("useSelectedLayers keeps its reference while layers and selection are unchanged", () => {
		seen.length = 0;
		renderInDesigner(
			<>
				<Dispatcher />
				<Selected />
			</>,
			{ layers: [makeLayer("a")] }
		);
		act(() => {
			dispatch({
				type: "SELECT_LAYER",
				payload: { layerId: "a", shiftKey: false },
			});
		});
		const afterSelect = seen[seen.length - 1];
		expect((afterSelect as unknown[]).length).toBe(1);
		const count = seen.length;
		act(() => {
			dispatch({ type: "SET_ZOOM", payload: 2 });
		});
		act(() => {
			dispatch({ type: "SET_ZOOM", payload: 3 });
		});
		// With selectors a zoom change no longer re-renders this component at all
		// (P2); the reference must still be unchanged.
		expect(seen.length).toBe(count);
		expect(seen[seen.length - 1]).toBe(afterSelect);
	});

	it("SET_ZOOM does not re-render components using only layers, selection or history", () => {
		const c = counter();
		renderInDesigner(
			<>
				<Dispatcher />
				<Profiler id="slices" onRender={c.onRender}>
					<LayerSliceReaders />
				</Profiler>
			</>,
			{ layers: [makeLayer("a")] }
		);
		const before = c.counts.commits;
		for (let i = 0; i < 5; i++) {
			act(() => {
				dispatch({ type: "SET_ZOOM", payload: 1 + (i + 1) / 10 });
			});
		}
		expect(c.counts.commits - before).toBe(0);
	});

	it("UPDATE_LAYER_CSS does not re-render a component using only useZoom", () => {
		const c = counter();
		renderInDesigner(
			<>
				<Dispatcher />
				<Profiler id="zoom" onRender={c.onRender}>
					<ZoomReader />
				</Profiler>
			</>,
			{ layers: [makeLayer("a")] }
		);
		const before = c.counts.commits;
		for (let i = 0; i < 5; i++) {
			act(() => {
				unrelatedChange(i);
			});
		}
		expect(c.counts.commits - before).toBe(0);
	});

	it("SET_ZOOM does not re-render the real PaneLayerTree or its rows", () => {
		const c = counter();
		renderInDesigner(
			<>
				<Dispatcher />
				<Profiler id="tree" onRender={c.onRender}>
					<PaneLayerTree />
				</Profiler>
			</>,
			{ layers: [makeLayer("a", [makeLayer("b")]), makeLayer("c")] }
		);
		const before = c.counts.commits;
		for (let i = 0; i < 5; i++) {
			act(() => {
				dispatch({ type: "SET_ZOOM", payload: 1 + (i + 1) / 10 });
			});
		}
		expect(c.counts.commits - before).toBe(0);
	});

	it("PaneLayerTree does re-render when the selection changes", () => {
		const c = counter();
		renderInDesigner(
			<>
				<Dispatcher />
				<Profiler id="tree" onRender={c.onRender}>
					<PaneLayerTree />
				</Profiler>
			</>,
			{ layers: [makeLayer("a"), makeLayer("c")] }
		);
		const before = c.counts.commits;
		act(() => {
			dispatch({
				type: "SELECT_LAYER",
				payload: { layerId: "a", shiftKey: false, breakpointId: "desktop" },
			});
		});
		expect(c.counts.commits - before).toBeGreaterThan(0);
	});

	it("UPDATE_LAYER_CSS does not re-render the real ZoomControl", () => {
		const c = counter();
		renderInDesigner(
			<>
				<Dispatcher />
				<Profiler id="zoomctl" onRender={c.onRender}>
					<ZoomControl />
				</Profiler>
			</>,
			{ layers: [makeLayer("a")] }
		);
		const before = c.counts.commits;
		for (let i = 0; i < 5; i++) {
			act(() => {
				unrelatedChange(i);
			});
		}
		expect(c.counts.commits - before).toBe(0);
	});

	describe("per-layer rendering", () => {
		const renders: Record<string, number> = {};
		const probeType: LayerType = {
			type: "probe",
			name: "Probe",
			defaultValues: { name: "probe", value: "" },
			supportsChildren: true,
			render: (layer, children) => {
				renders[layer.id] = (renders[layer.id] ?? 0) + 1;
				return <div>{children}</div>;
			},
		};
		const probe = (id: string, children?: Layer[]) =>
			makeLayer(id, children, { type: "probe" });

		const mountTree = () => {
			for (const key of Object.keys(renders)) {
				delete renders[key];
			}
			render(
				<DesignerProvider
					defaultLayers={[
						probe("A", [probe("A1", [probe("A11")]), probe("A2")]),
						probe("B", [probe("B1")]),
					]}
					defaultLayerTypes={[...defaultLayerTypes, probeType]}
					breakpoints={breakpoints}
				>
					<Dispatcher />
					{breakpoints.map((bp) => (
						<BreakpointFrame
							key={bp.id}
							breakpoint={bp}
							isActive={false}
							isSelected={false}
						/>
					))}
				</DesignerProvider>
			);
			for (const key of Object.keys(renders)) {
				renders[key] = 0;
			}
		};

		it("UPDATE_LAYER_CSS on A11 re-renders only A11, A1 and A, once per frame", () => {
			mountTree();
			act(() => {
				dispatch({
					type: "UPDATE_LAYER_CSS",
					payload: { id: "A11", css: { color: "red" } },
				});
			});
			const frames = breakpoints.length;
			expect(renders.A11).toBe(frames);
			expect(renders.A1).toBe(frames);
			expect(renders.A).toBe(frames);
			expect(renders.A2).toBe(0);
			expect(renders.B).toBe(0);
			expect(renders.B1).toBe(0);
		});

		it("SET_ZOOM re-renders no DesignerLayer", () => {
			mountTree();
			act(() => {
				dispatch({ type: "SET_ZOOM", payload: 2 });
			});
			expect(Object.values(renders).reduce((a, b) => a + b, 0)).toBe(0);
		});
	});

	it("UPDATE_LAYER_CSS only replaces the edited layer and its ancestors", () => {
		const tree = () => [
			makeLayer("A", [makeLayer("A1", [makeLayer("A11")]), makeLayer("A2")]),
			makeLayer("B", [makeLayer("B1")]),
		];
		renderInDesigner(
			<>
				<Dispatcher />
				<Capture />
			</>,
			{ layers: tree() }
		);
		const before = latest;
		const [A, B] = before;
		const [A1, A2] = A.children ?? [];
		const A11 = A1.children?.[0];
		act(() => {
			unrelatedCssOn("A11");
		});
		const after = latest;
		expect(after).not.toBe(before);
		expect(after[0]).not.toBe(A);
		expect(after[0].children?.[0]).not.toBe(A1);
		expect(after[0].children?.[0].children?.[0]).not.toBe(A11);
		expect(after[0].children?.[1]).toBe(A2);
		expect(after[1]).toBe(B);
		expect(after[1].children).toBe(B.children);
	});
});

const unrelatedCssOn = (id: string) => {
	dispatch({
		type: "UPDATE_LAYER_CSS",
		payload: { id, css: { color: "red" } },
	});
};
