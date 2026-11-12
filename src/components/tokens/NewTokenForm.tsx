import { useState } from "react";
import { useTokenEditing } from "../../hooks/useTokenEditing";
import { useTokens } from "../../hooks/useTokens";
import { pathProblem } from "../../lib/tokenEdits";
import type { TokenTier, TokenType } from "../../lib/tokens";
import { Select } from "../common/Select";
import { Field, selectClass } from "./TokenEditor";
import { TIER_LABEL, TIER_ORDER } from "./TokenList";
import { TokenValueField } from "./TokenValueField";

const TYPES: {
	type: TokenType;
	label: string;
	example: string;
	prefix: string;
}[] = [
	{ type: "color", label: "Color", example: "#f2545b", prefix: "color." },
	{ type: "dimension", label: "Size", example: "16px", prefix: "size." },
	{
		type: "fontFamily",
		label: "Font",
		example: "Inter, sans-serif",
		prefix: "font.family.",
	},
	{
		type: "fontWeight",
		label: "Weight",
		example: "600",
		prefix: "font.weight.",
	},
	{ type: "number", label: "Number", example: "1.5", prefix: "number." },
	{
		type: "shadow",
		label: "Shadow",
		example: "0 1px 2px rgb(0 0 0 / 0.2)",
		prefix: "shadow.",
	},
];

/** Name, type, tier and value for a new token. */
export const NewTokenForm = ({
	tier: initialTier,
	onDone,
}: {
	tier: TokenTier;
	onDone: (created: { path: string; tier: TokenTier } | null) => void;
}) => {
	const store = useTokens();
	const edit = useTokenEditing();
	const [type, setType] = useState<TokenType>("color");
	const [tier, setTier] = useState<TokenTier>(initialTier);
	const [path, setPath] = useState("color.");
	const [value, setValue] = useState("");
	const [tried, setTried] = useState(false);
	const meta = TYPES.find((t) => t.type === type) ?? TYPES[0];
	const problem =
		pathProblem(path, store.tokens) ??
		(value.trim() ? null : "Give it a value");

	const create = () => {
		setTried(true);
		if (problem) return;
		edit.add({ path, type, tier, value: value.trim() });
		onDone({ path, tier });
	};

	return (
		<form
			aria-label="New token"
			onSubmit={(event) => {
				event.preventDefault();
				create();
			}}
			onKeyDown={(event) => event.key === "Escape" && onDone(null)}
			className="mx-2 mb-2 flex flex-col gap-2 rounded-lg border border-border bg-card p-2.5 text-control"
		>
			<span className="text-title">New token</span>
			<Field label="Type">
				<Select
					ariaLabel="Type"
					className={selectClass}
					value={type}
					items={TYPES.map((t) => ({ label: t.label, value: t.type }))}
					onValueChange={(value) => {
						const next = TYPES.find((t) => t.type === value) ?? TYPES[0];
						// Keep a typed name; swap the starter prefix.
						if (path === meta.prefix || !path) setPath(next.prefix);
						setType(next.type);
						setValue("");
					}}
				/>
			</Field>
			<Field label="Name">
				<input
					// biome-ignore lint/a11y/noAutofocus: the form opens to be filled in
					autoFocus
					aria-label="Name"
					value={path}
					onChange={(event) => setPath(event.target.value)}
					className="h-7 min-w-0 flex-1 rounded-md bg-input px-2 font-mono text-value outline-none focus-visible:ring-2 focus-visible:ring-ring"
				/>
			</Field>
			<Field label="Tier">
				<Select
					ariaLabel="Tier"
					className={selectClass}
					value={tier}
					items={TIER_ORDER.map((t) => ({ label: TIER_LABEL[t], value: t }))}
					onValueChange={(value) => setTier(value as TokenTier)}
				/>
			</Field>
			<Field label="Value">
				<TokenValueField
					key={type}
					label="Value"
					type={type}
					value={value}
					placeholder={meta.example}
					onCommit={setValue}
					live
				/>
			</Field>
			{tried && problem && (
				<p className="text-caption text-destructive">{problem}</p>
			)}
			<div className="flex justify-end gap-1">
				<button
					type="button"
					onClick={() => onDone(null)}
					className="h-7 rounded-md px-2.5 hover:bg-hover"
				>
					Cancel
				</button>
				<button
					type="submit"
					className="h-7 rounded-md bg-primary px-2.5 font-medium text-primary-foreground hover:bg-primary/90"
				>
					Create
				</button>
			</div>
		</form>
	);
};
