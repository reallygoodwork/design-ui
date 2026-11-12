import { useEffect, useRef, useState } from "react";

const EDITOR_WIDTH = 1280;
const EDITOR_HEIGHT = 760;

/**
 * The full editor in an iframe, scaled to fit. It stays inert until clicked:
 * the canvas captures the wheel, which would otherwise trap page scrolling.
 */
export const EditorEmbed = () => {
	const ref = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(0.7);
	const [active, setActive] = useState(false);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		const observer = new ResizeObserver(() => {
			setScale(element.clientWidth / EDITOR_WIDTH);
		});
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	return (
		<>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: only releases the pointer when it leaves */}
			<div
				ref={ref}
				onMouseLeave={() => setActive(false)}
				className="relative hidden overflow-hidden rounded-lg border border-border bg-muted md:block"
				style={{ height: EDITOR_HEIGHT * scale }}
			>
				<iframe
					src="/demo/"
					title="Coral Design editor"
					loading="lazy"
					className="origin-top-left border-0"
					style={{
						width: EDITOR_WIDTH,
						height: EDITOR_HEIGHT,
						transform: `scale(${scale})`,
						pointerEvents: active ? "auto" : "none",
					}}
				/>
				{!active && (
					<button
						type="button"
						onClick={() => setActive(true)}
						className="group absolute inset-0 grid cursor-pointer place-items-center hover:bg-foreground/5"
					>
						<span className="rounded-md bg-foreground px-3 py-1.5 font-medium text-background text-sm">
							Click to use the editor
						</span>
					</button>
				)}
			</div>
			<p className="rounded-lg bg-muted p-4 text-sm md:hidden">
				The editor needs a wider screen. Open{" "}
				<a href="/demo/" className="underline underline-offset-2">
					the full editor
				</a>{" "}
				on a desktop to try it.
			</p>
		</>
	);
};
