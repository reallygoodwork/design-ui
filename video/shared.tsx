import type { Action } from "@design-ui/react";
import { useDesignerAction } from "@design-ui/react";
import { type ReactNode, useEffect, useRef } from "react";
import type { Act } from "./kit";

// What every video page shares: a line from the script (which runs outside
// React) to the designer store, and a way to aim the stage's cursor at real
// controls, which have no data-target of their own.

export const store: { dispatch: ((action: Action) => void) | null } = {
	dispatch: null,
};

/** Mount inside the Sandbox: hands the script the store's dispatch. */
export const StoreBridge = () => {
	const dispatch = useDesignerAction();
	useEffect(() => {
		store.dispatch = dispatch;
	}, [dispatch]);
	return null;
};

export const writeCss = (id: string, css: Record<string, string>) =>
	store.dispatch?.({ type: "UPDATE_LAYER_CSS", payload: { id, css } });

/** The first element in the video matching the selector, and the text if given. */
export const find = (selector: string, text?: string) => {
	const all = document.querySelectorAll<HTMLElement>(`#example ${selector}`);
	return Array.from(all).find(
		(el) => text === undefined || el.textContent?.trim() === text
	);
};

/**
 * Name a real control for the cursor. Done just before the cursor goes for
 * it, since state changes can mount fresh elements.
 */
export const tag = (name: string, el: Element | undefined) => {
	el?.setAttribute("data-target", name);
	el?.setAttribute("data-cursor", "pointer");
	return name;
};

/**
 * The cursor presses the control, and the real control gets the press as a
 * pointer would make it. A bare click() reads as a keyboard press, and Base
 * UI opens popups from the keyboard without their transition.
 */
export const press = async <S,>(
	a: Act<S>,
	name: string,
	el: HTMLElement | undefined
) => {
	await a.click({ at: tag(name, el) });
	if (!el) return;
	const r = el.getBoundingClientRect();
	const at = {
		bubbles: true,
		cancelable: true,
		composed: true,
		clientX: r.left + r.width / 2,
		clientY: r.top + r.height / 2,
		button: 0,
		pointerId: 1,
		pointerType: "mouse",
		isPrimary: true,
	};
	el.dispatchEvent(new PointerEvent("pointerdown", { ...at, buttons: 1 }));
	el.dispatchEvent(
		new MouseEvent("mousedown", { ...at, buttons: 1, detail: 1 })
	);
	el.dispatchEvent(new PointerEvent("pointerup", at));
	el.dispatchEvent(new MouseEvent("mouseup", { ...at, detail: 1 }));
	el.dispatchEvent(new MouseEvent("click", { ...at, detail: 1 }));
};

/**
 * A stage point in the page's own coordinates, for events dispatched on real
 * controls while the stage's cursor is drawn there.
 */
export const toClient = (point: { x: number; y: number }) => {
	const stage = document.querySelector(".ss-stage") as HTMLElement;
	const r = stage.getBoundingClientRect();
	const scale = r.width / stage.offsetWidth || 1;
	return { x: r.left + point.x * scale, y: r.top + point.y * scale };
};

/** Send one pointer event (and its mouse twin, for down and up) to a control. */
export const pointer = (
	el: Element,
	type: "pointerdown" | "pointermove" | "pointerup",
	at: { x: number; y: number }
) => {
	const init = {
		bubbles: true,
		cancelable: true,
		composed: true,
		clientX: at.x,
		clientY: at.y,
		button: 0,
		buttons: type === "pointerup" ? 0 : 1,
		pointerId: 1,
		pointerType: "mouse",
		isPrimary: true,
	};
	el.dispatchEvent(new PointerEvent(type, init));
	if (type === "pointerdown") {
		el.dispatchEvent(new MouseEvent("mousedown", { ...init, detail: 1 }));
	}
	if (type === "pointerup") {
		el.dispatchEvent(new MouseEvent("mouseup", { ...init, detail: 1 }));
	}
};

/** Call first in a script: the recorder stops when the second loop begins. */
export const countLoop = () => {
	const host = window as { __loops?: number };
	host.__loops = (host.__loops ?? 0) + 1;
};

/**
 * Base UI portals popovers to <body>, outside the stage. While this is
 * mounted, what React inserts into <body> (other than the app root) goes into
 * this scene instead, and its removal is redirected to match, so the stage
 * frames, crops and records the popover under its cursor. `watch` can attach
 * more observers to the scene; it returns one to disconnect on unmount.
 */
export const PortalHome = ({
	className,
	watch,
	children,
}: {
	className: string;
	watch?: (scene: HTMLElement) => MutationObserver;
	children: ReactNode;
}) => {
	const scene = useRef<HTMLDivElement>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: installed once
	useEffect(() => {
		const body = document.body;
		const home = scene.current;
		if (!home) return;
		const adopts = (node: Node) =>
			node instanceof HTMLElement &&
			node.id !== "root" &&
			node.tagName !== "SCRIPT";
		const own = {
			appendChild: body.appendChild,
			insertBefore: body.insertBefore,
			removeChild: body.removeChild,
		};
		Object.assign(body, {
			appendChild<T extends Node>(node: T): T {
				return adopts(node)
					? home.appendChild(node)
					: own.appendChild.call(body, node);
			},
			insertBefore<T extends Node>(node: T, before: Node | null): T {
				return adopts(node)
					? home.appendChild(node)
					: own.insertBefore.call(body, node, before);
			},
			removeChild<T extends Node>(node: T): T {
				return node.parentNode === home
					? home.removeChild(node)
					: own.removeChild.call(body, node);
			},
		});
		const watcher = watch?.(home);
		return () => {
			Object.assign(body, own);
			watcher?.disconnect();
		};
	}, []);
	return (
		<div ref={scene} className={`${className} ss-native`}>
			{children}
		</div>
	);
};
