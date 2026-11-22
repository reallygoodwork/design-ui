import { createContext, type ReactNode, useContext, useState } from "react";

/**
 * Maps breakpoint ids to their frame root element (today `.breakpoint-content`)
 * and answers every query about the design DOM. Nothing else should call
 * `document.querySelector` / `document.elementsFromPoint` on design nodes, so
 * the frame root can later move into a shadow root without touching callers.
 */
export type FrameRegistry = {
	register: (breakpointId: string, el: HTMLElement) => void;
	unregister: (breakpointId: string, el?: HTMLElement) => void;
	getFrameRoot: (breakpointId: string) => HTMLElement | null;
	/**
	 * A layer's element inside one breakpoint's frame. With no breakpoint id (or
	 * an unregistered one), the first registered frame that contains it.
	 */
	queryLayer: (
		breakpointId: string | null,
		layerId: string
	) => HTMLElement | null;
	/** Every layer element in every registered frame. */
	getAllLayerElements: () => HTMLElement[];
	/**
	 * Layer ids under a point, shallowest (parent) first and unfiltered, plus the
	 * breakpoint that was hit.
	 */
	layersAtPoint: (
		x: number,
		y: number
	) => { layerIds: string[]; breakpointId: string | null };
};

const layerSelector = (layerId: string) =>
	`.designer-layer[data-layer-id="${layerId}"]`;

export const createFrameRegistry = (): FrameRegistry => {
	const roots = new Map<string, HTMLElement>();

	return {
		register: (breakpointId, el) => {
			roots.set(breakpointId, el);
		},
		unregister: (breakpointId, el) => {
			if (!el || roots.get(breakpointId) === el) {
				roots.delete(breakpointId);
			}
		},
		getFrameRoot: (breakpointId) => roots.get(breakpointId) ?? null,
		queryLayer: (breakpointId, layerId) => {
			const own = breakpointId ? roots.get(breakpointId) : undefined;
			for (const root of own ? [own] : roots.values()) {
				const el = root.querySelector<HTMLElement>(layerSelector(layerId));
				if (el) return el;
			}
			return null;
		},
		getAllLayerElements: () =>
			[...roots.values()].flatMap((root) => [
				...root.querySelectorAll<HTMLElement>(".designer-layer"),
			]),
		layersAtPoint: (x, y) => {
			// One query per distinct root node (the document, or a shadow root).
			const rootNodes = new Set<Document | ShadowRoot>();
			for (const root of roots.values()) {
				const node = root.getRootNode();
				if ("elementsFromPoint" in node) {
					rootNodes.add(node as Document | ShadowRoot);
				}
			}
			// elementsFromPoint is front-to-back, i.e. deepest first
			const elements = [...rootNodes].flatMap((node) =>
				node.elementsFromPoint(x, y)
			);

			let breakpointId: string | null = null;
			for (const el of elements) {
				const frame = el.closest("[data-breakpoint-id]");
				if (frame) {
					breakpointId = frame.getAttribute("data-breakpoint-id");
					break;
				}
			}

			const layerIds = elements
				.filter(
					(el) =>
						el.classList.contains("designer-layer") &&
						el.hasAttribute("data-layer-id")
				)
				.map((el) => el.getAttribute("data-layer-id"))
				.filter((id): id is string => id !== null)
				.reverse();

			return { layerIds, breakpointId };
		},
	};
};

/** Inert fallback outside a provider: nothing registers, every query is empty. */
const emptyRegistry: FrameRegistry = {
	...createFrameRegistry(),
	register: () => {},
	unregister: () => {},
};

const FrameRegistryContext = createContext<FrameRegistry>(emptyRegistry);

/** One registry per Designer instance. */
export const FrameRegistryProvider = ({
	children,
}: {
	children: ReactNode;
}) => {
	const [registry] = useState(createFrameRegistry);
	return (
		<FrameRegistryContext.Provider value={registry}>
			{children}
		</FrameRegistryContext.Provider>
	);
};

export const useFrameRegistry = (): FrameRegistry =>
	useContext(FrameRegistryContext);
