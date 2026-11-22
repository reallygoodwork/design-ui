import { describe, expect, it } from "vitest";
import { normalize } from "./layerTree";
import {
	type Action,
	createDesignerStore,
	firstRejection,
	initialState,
	type State,
} from "./reducer";
import type { Rule } from "./rules";

const AGENT = { kind: "agent", name: "Agent" } as const;

const sizeLocked: Rule = {
	id: "no-size",
	target: {},
	editableProperties: ["--color"],
};

const setup = (role: State["role"], rules: Rule[] = [sizeLocked]) =>
	createDesignerStore({
		...initialState,
		...normalize([{ id: "title", name: "Title", type: "text", value: "Hi" }]),
		breakpoints: [
			{
				id: "mobile",
				name: "Mobile",
				width: 375,
				height: 667,
				position: { x: 0, y: 0 },
			},
		],
		rules,
		role,
	});

const resize: Action = {
	type: "UPDATE_LAYER_CSS",
	payload: { id: "title", css: { "--font-size": "40px" } },
};

describe("the store enforces rules", () => {
	it("leaves the document and history unchanged when it blocks a change", () => {
		const store = setup("editor");
		const before = store.getState();
		const result = store.dispatchWithMeta(resize, {});
		const after = store.getState();
		expect(result).toEqual({
			ruleId: "no-size",
			message: "Title's font size can't be changed",
		});
		expect(after.nodes).toBe(before.nodes);
		expect(after.history).toBe(before.history);
		expect(after.rejection).toMatchObject({ ruleId: "no-size" });
	});

	it("doesn't log a blocked change", () => {
		const store = setup("editor");
		const seen: Action[] = [];
		store.observe(({ action }) => seen.push(action));
		store.dispatch(resize);
		expect(seen).toEqual([]);
	});

	it("lets builders through", () => {
		const store = setup("builder");
		expect(store.dispatchWithMeta(resize, {})).toBeNull();
		expect(store.getState().nodes.title.cssVars).toEqual({
			"--font-size": "40px",
		});
	});

	it("holds agents to the rules even when a builder is editing", () => {
		const store = setup("builder");
		expect(store.dispatchWithMeta(resize, { actor: AGENT })?.ruleId).toBe(
			"no-size"
		);
	});

	it("only lets builders change rules, even when there are none", () => {
		const editor = setup("editor", []);
		expect(
			editor.dispatchWithMeta({ type: "SET_RULES", payload: [sizeLocked] }, {})
				?.ruleId
		).toBe("builder-only");
		const builder = setup("builder", []);
		builder.dispatch({ type: "SET_RULES", payload: [sizeLocked] });
		expect(builder.getState().rules).toEqual([sizeLocked]);
	});

	it("makes rule changes undoable", () => {
		const store = setup("builder", []);
		store.dispatch({ type: "SET_RULES", payload: [sizeLocked] });
		store.dispatch({ type: "UNDO" });
		expect(store.getState().rules).toEqual([]);
	});
});

describe("firstRejection", () => {
	it("checks each action against the state the earlier ones leave", () => {
		const state = setup("editor", [
			{
				id: "two-max",
				target: { layerIds: ["box"] },
				structure: { maxChildren: 1 },
			},
		]).getState();
		const withBox = {
			...state,
			...normalize([
				{ id: "box", name: "Box", type: "frame", value: "", children: [] },
			]),
		};
		const add = (id: string): Action => ({
			type: "ADD_LAYER",
			payload: {
				layer: { id, name: id, type: "text", value: "" },
				targetLayerId: "box",
				position: "inside",
			},
		});
		expect(firstRejection(withBox, [add("a"), add("b")], "editor")).toEqual({
			index: 1,
			ruleId: "two-max",
			message: "Box holds at most 1",
		});
	});
});
