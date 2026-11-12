import {
	type KeyboardEvent,
	type PointerEvent,
	type RefObject,
	useEffect,
	useState,
} from "react";
import { useDesignerSelector } from "../../hooks/useDesignerSelector";
import { useTokens } from "../../hooks/useTokens";

const STORAGE_KEY = "coral.tokenDrawerHeight";
const MIN = 160;
const DEFAULT = 360;
/** Dragged this close to the top, the panel takes over the column. */
const SNAP_FULL = 56;
/** Dragged below this, letting go closes the panel. */
const SNAP_CLOSE = 96;
const STEP = 40;

const stored = () => {
	try {
		const value = Number(localStorage.getItem(STORAGE_KEY));
		return value >= MIN ? value : DEFAULT;
	} catch {
		return DEFAULT;
	}
};

const remember = (height: number) => {
	try {
		localStorage.setItem(STORAGE_KEY, String(Math.round(height)));
	} catch {
		// Private mode: the height just isn't remembered.
	}
};

/**
 * Height for the bottom token panel: dragged by its top edge, stepped with
 * the arrow keys, snapped to full view near the top and closed near the
 * bottom. Selecting a layer brings the canvas back from full view.
 */
export const useDrawerSize = (panelRef: RefObject<HTMLElement | null>) => {
	const {
		tableMaximized: maximized,
		setTableMaximized: setMaximized,
		setTableOpen,
	} = useTokens();
	const [height, setHeight] = useState(stored);
	const [dragging, setDragging] = useState(false);
	// While dragging, show where letting go would land.
	const [pending, setPending] = useState<"full" | "close" | null>(null);

	const room = () =>
		panelRef.current?.parentElement?.clientHeight ?? window.innerHeight;

	const selected = useDesignerSelector((state) => state.selectedLayers[0]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: only a new selection restores the canvas
	useEffect(() => {
		if (selected) setMaximized(false);
	}, [selected]);

	const onPointerDown = (event: PointerEvent<HTMLElement>) => {
		if (event.button !== 0) return;
		event.preventDefault();
		const startY = event.clientY;
		const startHeight = maximized ? room() : height;
		const target = event.currentTarget;
		target.setPointerCapture(event.pointerId);
		setDragging(true);
		let last = startHeight;

		const move = (e: globalThis.PointerEvent) => {
			const max = room();
			last = Math.max(0, Math.min(max, startHeight + (startY - e.clientY)));
			setPending(
				last > max - SNAP_FULL ? "full" : last < SNAP_CLOSE ? "close" : null
			);
			setMaximized(false);
			setHeight(Math.max(MIN, last));
		};
		const up = () => {
			target.removeEventListener("pointermove", move);
			target.removeEventListener("pointerup", up);
			target.removeEventListener("pointercancel", up);
			setDragging(false);
			setPending(null);
			const max = room();
			if (last > max - SNAP_FULL) {
				setMaximized(true);
				setHeight(startHeight > max - SNAP_FULL ? DEFAULT : startHeight);
			} else if (last < SNAP_CLOSE) {
				setTableOpen(false);
				setHeight(startHeight);
			} else {
				remember(Math.max(MIN, last));
			}
		};
		target.addEventListener("pointermove", move);
		target.addEventListener("pointerup", up);
		target.addEventListener("pointercancel", up);
	};

	const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		const max = room();
		const current = maximized ? max : height;
		let next: number | null = null;
		if (event.key === "ArrowUp") next = current + STEP;
		else if (event.key === "ArrowDown") next = current - STEP;
		else if (event.key === "Home") next = max;
		else if (event.key === "End") next = MIN;
		else if (event.key === "Enter") {
			event.preventDefault();
			setMaximized(!maximized);
			return;
		}
		if (next === null) return;
		event.preventDefault();
		if (next >= max) {
			setMaximized(true);
			return;
		}
		setMaximized(false);
		const clamped = Math.max(MIN, next);
		setHeight(clamped);
		remember(clamped);
	};

	return {
		maximized,
		toggleMaximized: () => setMaximized(!maximized),
		dragging,
		pending,
		/** For `role="separator"`: how much of the column the panel takes. */
		percent: maximized ? 100 : Math.round((height / room()) * 100),
		style: {
			height: maximized ? "100%" : `${height}px`,
			maxHeight: "100%",
		},
		handleProps: {
			onPointerDown,
			onKeyDown,
			onDoubleClick: () => setMaximized(!maximized),
		},
	};
};
