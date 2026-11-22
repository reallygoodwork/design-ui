import { useEffect, useRef, useState } from "react";

type Item = { id: string; label: string; group: string };

const Arrow = () => (
	<svg
		aria-hidden="true"
		viewBox="0 0 16 16"
		width="12"
		height="12"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M3 3v4a3 3 0 0 0 3 3h7" />
		<path d="m10 7 3 3-3 3" />
	</svg>
);

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const Switcher = ({
	states,
	active,
	onChange,
}: {
	states: Item[];
	active: string;
	onChange: (id: string) => void;
}) => {
	const [hidden, setHidden] = useState(false);
	const listRef = useRef<HTMLElement>(null);
	const groups = [...new Set(states.map((s) => s.group))];

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (
				e.defaultPrevented ||
				e.metaKey ||
				e.ctrlKey ||
				e.altKey ||
				e.shiftKey
			)
				return;
			const t = e.target as HTMLElement;
			if (
				t.closest(
					"input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='combobox'], [role='slider'], [role='radiogroup'], [role='menu'], [role='listbox']"
				)
			)
				return;
			if (e.key === "h" || e.key === "H") {
				setHidden((h) => !h);
				return;
			}
			const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[
				e.key
			];
			if (!step) return;
			e.preventDefault();
			const i = states.findIndex((s) => s.id === active);
			onChange(states[(i + step + states.length) % states.length].id);
		};
		addEventListener("keydown", onKey);
		return () => removeEventListener("keydown", onKey);
	}, [states, active, onChange]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll when the active state changes
	useEffect(() => {
		listRef.current
			?.querySelector('[aria-pressed="true"]')
			?.scrollIntoView({ block: "nearest" });
	}, [active]);

	if (hidden) return <span />;

	return (
		<>
			<nav ref={listRef} className="state-switcher" aria-label="States">
				{groups.map((group) => (
					// biome-ignore lint/a11y/useSemanticElements: switcher spec uses role=group
					<div
						key={group}
						className="state-switcher-group"
						role="group"
						aria-labelledby={`states-${slug(group)}`}
					>
						<span
							className="state-switcher-heading"
							id={`states-${slug(group)}`}
						>
							<Arrow />
							{group}
						</span>
						{states
							.filter((s) => s.group === group)
							.map((s) => (
								<button
									key={s.id}
									type="button"
									data-state={s.id}
									aria-pressed={s.id === active}
									onClick={() => onChange(s.id)}
								>
									{s.label}
								</button>
							))}
					</div>
				))}
			</nav>
			<div className="state-switcher-select">
				<select
					aria-label="State"
					value={active}
					onChange={(e) => onChange(e.target.value)}
				>
					{groups.map((group) => (
						<optgroup key={group} label={group}>
							{states
								.filter((s) => s.group === group)
								.map((s) => (
									<option key={s.id} value={s.id}>
										{s.label}
									</option>
								))}
						</optgroup>
					))}
				</select>
				<svg
					aria-hidden="true"
					viewBox="0 0 16 16"
					width="12"
					height="12"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="m4 6 4 4 4-4" />
				</svg>
			</div>
		</>
	);
};
