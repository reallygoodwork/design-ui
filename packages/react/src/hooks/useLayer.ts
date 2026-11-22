import { denormalizeNode } from "@design-ui/core";
import { useCallback } from "react";
import type { Layer } from "../lib/Types";
import { useDesignerSelector } from "./useDesignerSelector";

/**
 * Select one layer by id, nested with its children. The returned object keeps
 * its identity while that layer and its subtree are unchanged, so consumers
 * only re-render when it is edited.
 */
export const useLayer = (id: string): Layer | null =>
	useDesignerSelector(
		useCallback((state) => denormalizeNode(state.nodes, id), [id])
	);
