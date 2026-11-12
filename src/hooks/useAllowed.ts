import {
	type Action,
	type Allowed,
	allowed,
	checkAction,
	type Rejection,
	type RulesContext,
} from "@design-ui/core";
import { createContext, useContext, useMemo } from "react";
import { useDesignerSelector } from "./useDesignerSelector";

export const EVERYTHING: Allowed = {
	editableProperties: null,
	values: {},
	content: true,
	structureLocked: false,
	allowedChildren: null,
	breakpointOverrides: true,
};

const useRulesContext = (): RulesContext & { role: "builder" | "editor" } => {
	const nodes = useDesignerSelector((s) => s.nodes);
	const rules = useDesignerSelector((s) => s.rules);
	const role = useDesignerSelector((s) => s.role);
	const breakpoints = useDesignerSelector((s) => s.breakpoints);
	return useMemo(
		() => ({ nodes, rules, role, breakpoints }),
		[nodes, rules, role, breakpoints]
	);
};

/** What the current role may change on a layer, from the editing rules. */
export const useAllowed = (layerId: string | undefined): Allowed => {
	const ctx = useRulesContext();
	return useMemo(
		() => (layerId ? allowed(ctx, layerId, ctx.role) : EVERYTHING),
		[ctx, layerId]
	);
};

/** Why the rules would block `action`, or null. For explaining a locked control. */
export const useWhyBlocked = (action: Action | null): Rejection | null => {
	const ctx = useRulesContext();
	const key = JSON.stringify(action);
	// biome-ignore lint/correctness/useExhaustiveDependencies: the action is compared by value through `key`
	return useMemo(
		() => (action ? checkAction(ctx, action, ctx.role) : null),
		[ctx, key]
	);
};

/**
 * The selected layer's limits, provided once by the styles panel so each
 * row doesn't subscribe to the store. Outside a panel, everything is allowed.
 */
export const AllowedContext = createContext<Allowed>(EVERYTHING);

export type PropertyAccess = {
	editable: boolean;
	/** Only a token can be used. */
	tokensOnly: boolean;
	min?: number;
	max?: number;
	unit?: string;
	oneOf?: string[];
};

/** Whether any of `properties` can be edited on the selected layer. */
export const useAnyEditable = (properties: readonly string[]): boolean => {
	const a = useContext(AllowedContext);
	return (
		!a.editableProperties ||
		properties.some((p) => a.editableProperties?.includes(p))
	);
};

/** Whether `property` can be edited on the selected layer, and within what limits. */
export const usePropertyAccess = (
	property: string | undefined
): PropertyAccess => {
	const a = useContext(AllowedContext);
	if (!property) return { editable: true, tokensOnly: false };
	const access: PropertyAccess = {
		editable: !a.editableProperties || a.editableProperties.includes(property),
		tokensOnly: false,
	};
	for (const c of a.values[property] ?? []) {
		if ("tokensOnly" in c) access.tokensOnly = true;
		else if ("oneOf" in c) access.oneOf = c.oneOf;
		else Object.assign(access, { min: c.min, max: c.max, unit: c.unit });
	}
	return access;
};
