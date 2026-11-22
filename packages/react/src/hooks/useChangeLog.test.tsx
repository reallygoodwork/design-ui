import type { Token } from "@design-ui/core";
import { describeTokenChange, revertWrites } from "@design-ui/core";
import { act, cleanup, render } from "@testing-library/react";
import { useContext } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { DesignerContext, DesignerProvider } from "../context/DesignerContext";
import { breakpoints, defaultLayerTypes, makeLayer } from "../test/fixtures";
import { AnnotationsProvider, useAnnotations } from "./useAnnotations";
import { ChangeLogProvider, useChangeLog } from "./useChangeLog";
import type { DesignerStore } from "./useDesigner";
import { useDesignerApi } from "./useDesignerApi";
import { TokensProvider, useTokens } from "./useTokens";

type Grab = {
	store: DesignerStore | null;
	log: ReturnType<typeof useChangeLog> | null;
	notes: ReturnType<typeof useAnnotations> | null;
	tokens: ReturnType<typeof useTokens> | null;
	api: ReturnType<typeof useDesignerApi> | null;
};
const grab: Grab = {
	store: null,
	log: null,
	notes: null,
	tokens: null,
	api: null,
};
const Capture = () => {
	grab.store = useContext(DesignerContext);
	grab.log = useChangeLog();
	grab.notes = useAnnotations();
	grab.tokens = useTokens();
	grab.api = useDesignerApi();
	return null;
};

const tokens: Token[] = [
	{ path: "brand", type: "color", tier: "primitive", value: "#f2545b" },
];

const setup = () =>
	render(
		<DesignerProvider
			defaultLayers={[
				makeLayer("L", undefined, {
					name: "Card",
					cssVars: { "--color": "#000000" },
				}),
			]}
			defaultLayerTypes={defaultLayerTypes}
			breakpoints={breakpoints}
		>
			<ChangeLogProvider>
				<TokensProvider tokens={tokens}>
					<AnnotationsProvider>
						<Capture />
					</AnnotationsProvider>
				</TokensProvider>
			</ChangeLogProvider>
		</DesignerProvider>
	);

const css = (value: string, breakpointId = "mobile") =>
	act(() =>
		grab.store?.dispatch({
			type: "UPDATE_LAYER_CSS",
			payload: { id: "L", css: { "--color": value }, breakpointId },
		})
	);
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));
const entries = () => grab.log?.entries ?? [];

afterEach(cleanup);

describe("change log", () => {
	it("records an edit with before and after, readably", () => {
		setup();
		css("var(--brand)");
		expect(entries()).toHaveLength(1);
		expect(entries()[0]).toMatchObject({
			actor: { kind: "user", name: "You" },
			summary: "Card: color #000000 → brand",
			layerIds: ["L"],
			changes: [
				{
					layerId: "L",
					property: "--color",
					breakpointId: null,
					from: "#000000",
					to: "var(--brand)",
				},
			],
		});
	});

	it("folds a run of the same edit into one entry, like undo does", () => {
		setup();
		css("#111111");
		css("#222222");
		css("#333333");
		expect(entries()).toHaveLength(1);
		expect(entries()[0].changes[0]).toMatchObject({
			from: "#000000",
			to: "#333333",
		});
	});

	it("names breakpoint overrides", () => {
		setup();
		css("#ff0000", "desktop");
		expect(entries()[0].summary).toBe("Card: color unset → #ff0000 at Desktop");
	});

	it("marks entries undone and back with undo and redo", () => {
		setup();
		css("#111111");
		act(() => grab.store?.dispatch({ type: "UNDO" }));
		expect(entries()[0].undone).toBe(true);
		act(() => grab.store?.dispatch({ type: "REDO" }));
		expect(entries()[0].undone).toBe(false);
	});

	it("ignores actions that don't change the document", () => {
		setup();
		act(() =>
			grab.store?.dispatch({
				type: "SELECT_LAYER",
				payload: { layerId: "L", shiftKey: false },
			})
		);
		act(() => grab.store?.dispatch({ type: "SET_ZOOM", payload: 0.5 }));
		expect(entries()).toHaveLength(0);
	});

	it("turns an agent's reason into a note on what it changed", () => {
		setup();
		act(() =>
			grab.api?.dispatch(
				{
					type: "UPDATE_LAYER_CSS",
					payload: {
						id: "L",
						css: { "--color": "var(--brand)" },
						breakpointId: "mobile",
					},
				},
				{
					actor: { kind: "agent", name: "Agent" },
					reason: "Use the brand color",
				}
			)
		);
		expect(entries()[0].actor).toEqual({ kind: "agent", name: "Agent" });
		expect(grab.notes?.annotations).toMatchObject([
			{
				kind: "note",
				body: "Use the brand color",
				author: { kind: "agent" },
				entryId: entries()[0].id,
				target: { kind: "change", layerId: "L" },
			},
		]);
	});

	it("logs token edits", async () => {
		setup();
		act(() =>
			grab.tokens?.setTokens((all) => all.map((t) => ({ ...t, value: "#000" })))
		);
		await flush();
		expect(entries().at(-1)).toMatchObject({
			kind: "tokens",
			summary: "Tokens: changed brand",
			undoable: false,
		});
	});

	it("credits a token edit to the agent that made it", async () => {
		setup();
		act(() => {
			grab.log?.attributeNextTokenEdit({
				actor: { kind: "agent", name: "Agent" },
				reason: "Darker brand",
				taskId: "t1",
			});
			grab.tokens?.setTokens((all) =>
				all.map((t) => ({ ...t, value: "#000" }))
			);
		});
		await flush();
		expect(entries().at(-1)).toMatchObject({
			actor: { kind: "agent" },
			reason: "Darker brand",
			taskId: "t1",
			summary: "Tokens: changed brand",
		});
		// Only that one: the next edit is the person's again.
		act(() =>
			grab.tokens?.setTokens((all) => all.map((t) => ({ ...t, value: "#111" })))
		);
		await flush();
		expect(entries().at(-1)?.actor.kind).toBe("user");
	});

	it("exports one JSON document with everything in it", () => {
		setup();
		css("#111111");
		act(() => {
			grab.notes?.add({
				target: { kind: "layer", layerId: "L" },
				body: "Looks good",
			});
		});
		const doc = grab.api?.exportDocument();
		expect(doc).toMatchObject({
			version: 1,
			tokens,
			annotations: [{ body: "Looks good" }],
		});
		expect(doc?.layers[0].id).toBe("L");
		expect(doc?.changes).toHaveLength(1);
		expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
	});
});

describe("annotations", () => {
	it("replies, resolves and reopens", () => {
		setup();
		let id = "";
		act(() => {
			id =
				grab.notes?.add({
					kind: "task",
					target: { kind: "token", path: "brand" },
					body: "Darken it",
				}) ?? "";
		});
		act(() => grab.notes?.reply(id, "On it", { kind: "agent", name: "Agent" }));
		act(() => grab.notes?.setStatus(id, "resolved"));
		expect(grab.notes?.annotations[0]).toMatchObject({
			kind: "task",
			status: "resolved",
			replies: [{ body: "On it", author: { kind: "agent" } }],
		});
		act(() => grab.notes?.remove(id));
		expect(grab.notes?.annotations).toEqual([]);
	});
});

describe("helpers", () => {
	it("summarizes token edits", () => {
		const a: Token = {
			path: "a",
			type: "color",
			tier: "primitive",
			value: "#fff",
		};
		expect(describeTokenChange([a], [{ ...a, path: "b" }])).toBe(
			"Renamed token a to b"
		);
		expect(describeTokenChange([], [a])).toBe("Tokens: added a");
		expect(describeTokenChange([a], [a])).toBeNull();
	});

	it("reverts each value to what it was, clearing ones that were unset", () => {
		expect(
			revertWrites({
				id: "x",
				at: "",
				actor: { kind: "user", name: "You" },
				kind: "layer",
				summary: "",
				layerIds: ["L"],
				undoable: true,
				changes: [
					{
						layerId: "L",
						property: "--color",
						breakpointId: null,
						from: "#000",
						to: "#fff",
					},
					{
						layerId: "L",
						property: "--gap",
						breakpointId: "desktop",
						from: undefined,
						to: "8px",
					},
				],
			})
		).toEqual([
			{ layerId: "L", breakpointId: null, css: { "--color": "#000" } },
			{ layerId: "L", breakpointId: "desktop", css: { "--gap": "" } },
		]);
	});
});
