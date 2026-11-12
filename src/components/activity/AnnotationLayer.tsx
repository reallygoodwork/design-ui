import { useEffect, useRef, useState } from "react";
import { useAnnotations } from "../../hooks/useAnnotations";
import { useDesignerSelector } from "../../hooks/useDesignerSelector";
import { type Annotation, layerOf } from "../../lib/annotations";
import { cn } from "../../lib/cn";
import { AnnotationThread, Avatar, Composer } from "./AnnotationThread";

type Box = { x: number; y: number; width: number; height: number };

const attr = (value: string) => JSON.stringify(value);

/** A layer's box on one frame, relative to `root`. */
const boxOf = (
	root: HTMLElement,
	layerId: string,
	breakpointId: string | null
): Box | null => {
	const frame = breakpointId
		? `.breakpoint-frame[data-breakpoint-id=${attr(breakpointId)}] `
		: "";
	const el = document.querySelector(
		`${frame}.designer-layer[data-layer-id=${attr(layerId)}]`
	);
	if (!el) return null;
	const r = el.getBoundingClientRect();
	const base = root.getBoundingClientRect();
	return {
		x: r.left - base.left,
		y: r.top - base.top,
		width: r.width,
		height: r.height,
	};
};

const isTyping = (target: EventTarget | null) =>
	target instanceof HTMLElement &&
	(target.isContentEditable ||
		["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * Over the canvas: a pin on each layer with open annotations, a thread card
 * from each pin, and comment mode, where clicking a layer starts a comment
 * on it. C toggles comment mode; Escape leaves it.
 */
export const AnnotationLayer = () => {
	const {
		annotations,
		commentMode,
		setCommentMode,
		draft,
		setDraft,
		setOpenId,
	} = useAnnotations();
	const activeBreakpointId = useDesignerSelector(
		(state) => state.activeBreakpointId
	);
	const rootRef = useRef<HTMLDivElement>(null);
	const [boxes, setBoxes] = useState<Record<string, Box>>({});
	const [hovered, setHovered] = useState<Box | null>(null);
	const [card, setCard] = useState<string | null>(null);

	// Open annotations by the layer they sit on.
	const byLayer = new Map<string, Annotation[]>();
	for (const a of annotations) {
		const layerId = layerOf(a.target);
		if (a.status !== "open" || !layerId) continue;
		byLayer.set(layerId, [...(byLayer.get(layerId) ?? []), a]);
	}
	const layerIds = [...byLayer.keys()];
	const key = layerIds.join(",");

	// Follow the layers as the canvas pans, zooms and reflows.
	// biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for the layer list
	useEffect(() => {
		let frame = 0;
		let last = "";
		const tick = () => {
			const root = rootRef.current;
			if (root) {
				const next: Record<string, Box> = {};
				for (const id of layerIds) {
					const target = byLayer.get(id)?.[0]?.target;
					const bp =
						target?.kind === "layer" && target.breakpointId
							? target.breakpointId
							: activeBreakpointId;
					const box = boxOf(root, id, bp) ?? boxOf(root, id, null);
					if (box) next[id] = box;
				}
				const serial = JSON.stringify(next);
				if (serial !== last) {
					last = serial;
					setBoxes(next);
				}
			}
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [key, activeBreakpointId]);

	// C toggles comment mode; Escape leaves it and closes cards.
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (
				isTyping(event.target) ||
				event.metaKey ||
				event.ctrlKey ||
				event.altKey
			)
				return;
			if (event.key === "c" || event.key === "C") {
				event.preventDefault();
				setCommentMode(!commentMode);
			} else if (event.key === "Escape") {
				// One thing at a time: leaving comment mode keeps a comment being written.
				if (commentMode) setCommentMode(false);
				else setCard(null);
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [commentMode, setCommentMode, setDraft]);

	const layerAt = (x: number, y: number) => {
		for (const el of document.elementsFromPoint(x, y)) {
			const layer = el.closest<HTMLElement>(".designer-layer");
			if (layer?.dataset.layerId) {
				return {
					layerId: layer.dataset.layerId,
					breakpointId:
						layer.closest<HTMLElement>(".breakpoint-frame")?.dataset
							.breakpointId,
				};
			}
		}
		return null;
	};

	const cardFor = card ? byLayer.get(card) : undefined;
	const cardBox = card ? boxes[card] : undefined;

	return (
		<div
			ref={rootRef}
			className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
		>
			{commentMode && (
				// biome-ignore lint/a11y/noStaticElementInteractions: a pointer-only picking surface; the panel has a keyboard way to comment
				<div
					aria-hidden="true"
					className="pointer-events-auto absolute inset-0 cursor-crosshair"
					onPointerMove={(event) => {
						const hit = layerAt(event.clientX, event.clientY);
						const root = rootRef.current;
						setHovered(
							hit && root
								? boxOf(root, hit.layerId, hit.breakpointId ?? null)
								: null
						);
					}}
					onPointerLeave={() => setHovered(null)}
					onClick={(event) => {
						const hit = layerAt(event.clientX, event.clientY);
						const base = rootRef.current?.getBoundingClientRect();
						setDraft({
							target: hit
								? {
										kind: "layer",
										layerId: hit.layerId,
										breakpointId: hit.breakpointId,
									}
								: { kind: "document" },
							at: base
								? { x: event.clientX - base.left, y: event.clientY - base.top }
								: undefined,
						});
						setHovered(null);
						setCommentMode(false);
					}}
				>
					<span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-md bg-background px-2 py-1 text-control shadow-md">
						Click a layer to comment · Esc to stop
					</span>
					{hovered && (
						<span
							className="absolute rounded-sm outline-2 outline-accent outline-dashed"
							style={{
								left: hovered.x,
								top: hovered.y,
								width: hovered.width,
								height: hovered.height,
							}}
						/>
					)}
				</div>
			)}

			{layerIds.map((id) => {
				const box = boxes[id];
				const list = byLayer.get(id) ?? [];
				if (!box) return null;
				return (
					<button
						key={id}
						type="button"
						aria-label={`${list.length} open on this layer`}
						onClick={() => {
							setCard(card === id ? null : id);
							setOpenId(list[0]?.id ?? null);
						}}
						className={cn(
							"pointer-events-auto absolute flex h-6 -translate-y-1/2 items-center gap-0.5 rounded-full rounded-bl-none border border-border bg-background py-0.5 pr-1.5 pl-0.5 text-caption font-medium shadow-md transition-transform duration-150 hover:scale-105",
							card === id && "ring-2 ring-accent"
						)}
						style={{ left: box.x + box.width - 8, top: box.y }}
					>
						<Avatar actor={list[0].author} size="sm" />
						{list.length > 1 && <span>{list.length}</span>}
					</button>
				);
			})}

			{cardFor && cardBox && (
				<div
					role="dialog"
					aria-label="Comments on this layer"
					className="ds-popup ds-surface pointer-events-auto absolute flex max-h-96 w-72 flex-col gap-1.5 overflow-y-auto p-2"
					style={{
						left: Math.min(
							cardBox.x + cardBox.width + 20,
							(rootRef.current?.clientWidth ?? 9999) - 300
						),
						top: Math.max(8, cardBox.y - 12),
					}}
				>
					{cardFor.map((a) => (
						<AnnotationThread key={a.id} annotation={a} showTarget={false} />
					))}
					<button
						type="button"
						onClick={() => setCard(null)}
						className="h-7 rounded-md text-control text-muted-foreground hover:bg-hover"
					>
						Close
					</button>
				</div>
			)}

			{draft?.at && (
				<div
					role="dialog"
					aria-label="New comment"
					className="ds-popup ds-surface pointer-events-auto absolute w-72 p-2"
					style={{
						left: Math.min(
							draft.at.x + 12,
							(rootRef.current?.clientWidth ?? 9999) - 300
						),
						top: Math.max(8, draft.at.y - 12),
					}}
				>
					<Composer
						draft={draft}
						onDone={() => {
							setDraft(null);
						}}
					/>
				</div>
			)}
		</div>
	);
};
