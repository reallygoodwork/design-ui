import { describe, expect, it } from "vitest";
import { describeAction } from "./changeLog";
import { loadDocument } from "./document";
import { denormalize, normalize } from "./layerTree";
import {
	type Action,
	createDesignerStore,
	initialState,
	reducer,
} from "./reducer";
import { layerRuleId, ownRule, type Rule, updateLayerRule } from "./rules";

const layers = [
	{
		id: "page",
		name: "Page",
		type: "frame",
		value: "",
		children: [{ id: "title", name: "Title", type: "text", value: "Hi" }],
	},
];

const shared: Rule = {
	id: "brand",
	target: { layerTypes: ["text"] },
	editableProperties: ["group:color"],
};

describe("setting a rule on one layer", () => {
	it("creates the layer's own rule, and leaves other rules alone", () => {
		const rules = updateLayerRule([shared], "page", (r) => ({
			...r,
			structure: { ...r.structure, locked: true },
		}));
		expect(rules).toEqual([
			shared,
			{
				id: layerRuleId("page"),
				target: { layerIds: ["page"] },
				structure: { locked: true },
			},
		]);
		expect(ownRule(rules, "page")?.id).toBe("layer-page");
		expect(ownRule(rules, "title")).toBeUndefined();
	});

	it("edits a hand-written rule that covers only that layer", () => {
		const own: Rule = { id: "page-layout", target: { layerIds: ["page"] } };
		const rules = updateLayerRule([own], "page", (r) => ({
			...r,
			content: "locked",
		}));
		expect(rules).toEqual([{ ...own, content: "locked" }]);
	});

	it("removes the rule once it limits nothing", () => {
		const locked = updateLayerRule([], "page", (r) => ({
			...r,
			structure: { locked: true },
			values: { "group:color": { tokensOnly: true } },
		}));
		const unlocked = updateLayerRule(locked, "page", (r) => ({
			...r,
			structure: { ...r.structure, locked: false },
			values: {},
		}));
		expect(unlocked).toEqual([]);
	});
});

describe("rule changes in the editor", () => {
	const store = () =>
		createDesignerStore({ ...initialState, ...normalize(layers) });

	it("can be undone", () => {
		const s = store();
		s.dispatch({
			type: "SET_RULES",
			payload: updateLayerRule([], "page", (r) => ({
				...r,
				structure: { locked: true },
			})),
		});
		expect(s.getState().rules).toHaveLength(1);
		s.dispatch({ type: "UNDO" });
		expect(s.getState().rules).toEqual([]);
	});

	it("gets a change-log entry naming the layer", () => {
		const prev = { ...initialState, ...normalize(layers) };
		const action = {
			type: "SET_RULES",
			payload: updateLayerRule([], "page", (r) => ({
				...r,
				structure: { locked: true },
			})),
		} as const;
		const next = reducer(prev, action);
		expect(describeAction(action, prev, next)).toMatchObject({
			summary: "Added a rule on Page",
			layerIds: ["page"],
		});
		const removed: Action = { type: "SET_RULES", payload: [] };
		expect(describeAction(removed, next, reducer(next, removed))?.summary).toBe(
			"Removed the rule on Page"
		);
	});

	it("holds a builder previewing as an editor to the rules", () => {
		const s = store();
		s.dispatch({
			type: "SET_RULES",
			payload: updateLayerRule([], "page", (r) => ({
				...r,
				structure: { locked: true },
				values: { "group:color": { tokensOnly: true } },
			})),
		});
		s.dispatch({ type: "SET_PREVIEW", payload: true });
		s.dispatch({ type: "DELETE_LAYERS", payload: { layerIds: ["title"] } });
		expect(s.getState().rejection?.ruleId).toBe("layer-page");
		s.dispatch({
			type: "UPDATE_LAYER_CSS",
			payload: { id: "page", css: { "--background-color": "red" } },
		});
		expect(s.getState().nodes.page.cssVars?.["--background-color"]).toBe(
			undefined
		);
		s.dispatch({ type: "SET_RULES", payload: [] });
		expect(s.getState().rules).toHaveLength(1);

		s.dispatch({ type: "SET_PREVIEW", payload: false });
		s.dispatch({ type: "DELETE_LAYERS", payload: { layerIds: ["title"] } });
		expect(s.getState().nodes.title).toBeUndefined();
	});

	it("survive a round trip through a saved document", () => {
		const rules = updateLayerRule([shared], "page", (r) => ({
			...r,
			structure: { locked: true, allowedChildren: ["text"] },
			values: { "group:color": { tokensOnly: true } },
			editableProperties: ["group:color", "group:spacing"],
		}));
		const s = createDesignerStore({ ...initialState, ...normalize(layers) });
		s.dispatch({ type: "SET_RULES", payload: rules });
		const state = s.getState();
		const loaded = loadDocument(
			JSON.parse(
				JSON.stringify({
					version: 1,
					layers: denormalize(state.nodes, state.rootIds),
					breakpoints: [
						{
							id: "m",
							name: "M",
							width: 375,
							height: 667,
							position: { x: 0, y: 0 },
						},
					],
					rules: state.rules,
				})
			)
		);
		if (!loaded.ok) throw new Error(JSON.stringify(loaded.problems));
		expect(loaded.document.rules).toEqual(rules);
	});
});
