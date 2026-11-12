import { Dialog } from "@base-ui/react/dialog";
import { useMemo, useState } from "react";
import { useTokens } from "../../hooks/useTokens";
import { cn } from "../../lib/cn";
import {
	type ImportCandidate,
	importCandidates,
	scanCssVariables,
} from "../../lib/tokenEdits";
import {
	allModes,
	BREAKPOINT_DIMENSION,
	indexTokens,
	resolveToken,
	type Token,
} from "../../lib/tokens";
import { TokenGlyph } from "./TokenList";

const STATUS: Record<
	ImportCandidate["status"]["kind"],
	{ label: string; tone: string }
> = {
	new: { label: "New", tone: "bg-accent/12 text-accent-text" },
	same: { label: "Already a token", tone: "bg-input text-muted-foreground" },
	duplicate: { label: "Same as", tone: "bg-cat-type/14 text-cat-type" },
	conflict: {
		label: "Differs from",
		tone: "bg-destructive/12 text-destructive",
	},
	broken: { label: "Reads", tone: "bg-destructive/12 text-destructive" },
};

const detail = (c: ImportCandidate) => {
	const s = c.status;
	if (s.kind === "duplicate") return s.token;
	if (s.kind === "conflict") return `${s.token} (${s.value})`;
	if (s.kind === "broken") return `${s.missing}, which isn't defined`;
	if (s.kind === "same") return s.token;
	return null;
};

/** New tokens are on by default; a conflict replaces the token's value only if you tick it. */
const importable = (c: ImportCandidate) =>
	c.status.kind === "new" || c.status.kind === "conflict";

/**
 * Paste a stylesheet; every custom property in it is listed with what
 * importing it would do. Ticked ones become tokens.
 */
export const ImportCssDialog = ({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) => {
	const store = useTokens();
	const [css, setCss] = useState("");
	const [unticked, setUnticked] = useState<Set<string>>(new Set());

	const candidates = useMemo(() => {
		const byPath = indexTokens(store.tokens);
		// Compare against the default mode, not whatever the canvas shows.
		const mode = {
			...allModes(store.dimensions)[0],
			[BREAKPOINT_DIMENSION]: store.breakpointOrder[0] ?? "",
		};
		return importCandidates(
			scanCssVariables(css),
			store.tokens,
			(path) => resolveToken(path, mode, byPath, store.breakpointOrder).value
		);
	}, [css, store.tokens, store.dimensions, store.breakpointOrder]);

	const chosen = candidates.filter(
		(c) =>
			importable(c) &&
			(c.status.kind === "new" ? !unticked.has(c.name) : unticked.has(c.name))
	);

	const toggle = (name: string) =>
		setUnticked((prev) => {
			const next = new Set(prev);
			next.has(name) ? next.delete(name) : next.add(name);
			return next;
		});

	const apply = () => {
		store.setTokens((tokens) => {
			const replace = new Map(
				chosen
					.filter((c) => c.status.kind === "conflict")
					.map((c) => [c.path, c.tokenValue])
			);
			const added: Token[] = chosen
				.filter((c) => c.status.kind === "new")
				.map((c) => ({
					path: c.path,
					type: c.type,
					// A variable that reads another one names a use; a raw one is a primitive.
					tier: c.tokenValue.startsWith("{") ? "semantic" : "primitive",
					value: c.tokenValue,
					description: `Imported from ${c.selector}.`,
				}));
			return [
				...tokens.map((t) =>
					replace.has(t.path)
						? { ...t, value: replace.get(t.path) as string }
						: t
				),
				...added,
			];
		});
		setCss("");
		setUnticked(new Set());
		onOpenChange(false);
	};

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className="ds-backdrop fixed inset-0 z-50 bg-black/50" />
				<Dialog.Popup className="ds-dialog ds-surface fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100%-32px)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col gap-3 p-5">
					<Dialog.Title className="text-heading">
						Import CSS variables
					</Dialog.Title>
					<Dialog.Description className="text-control text-muted-foreground">
						Paste a stylesheet. Each custom property it declares can become a
						token named after it, so{" "}
						<code className="font-mono text-value">--brand-red</code> becomes{" "}
						<code className="font-mono text-value">brand.red</code>.
					</Dialog.Description>
					<textarea
						aria-label="CSS"
						value={css}
						onChange={(event) => setCss(event.target.value)}
						placeholder={
							":root {\n  --brand-red: #f2545b;\n  --gutter: 24px;\n}"
						}
						spellCheck={false}
						className="h-32 shrink-0 resize-none rounded-md bg-input p-2 font-mono text-value outline-none focus-visible:ring-2 focus-visible:ring-ring"
					/>
					{candidates.length > 0 && (
						<ul
							aria-label="Variables found"
							className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border"
						>
							{candidates.map((c) => {
								const can = importable(c);
								const on = chosen.includes(c);
								const status = STATUS[c.status.kind];
								return (
									<li
										key={c.name}
										className="flex items-center gap-2 border-b border-border px-2 py-1.5 text-control last:border-0"
									>
										<input
											type="checkbox"
											aria-label={`Import ${c.name}`}
											disabled={!can}
											checked={on}
											onChange={() => toggle(c.name)}
										/>
										<TokenGlyph
											type={c.type}
											value={c.value.startsWith("var(") ? undefined : c.value}
										/>
										<span className="flex min-w-0 flex-1 flex-col">
											<span className="truncate font-mono text-value">
												{c.name}
											</span>
											<span className="truncate text-caption text-muted-foreground">
												{c.path} · {c.type} · {c.tokenValue}
											</span>
										</span>
										<span
											className={cn(
												"max-w-48 shrink-0 truncate rounded px-1.5 py-0.5 text-caption",
												status.tone
											)}
										>
											{status.label}
											{detail(c) && ` ${detail(c)}`}
										</span>
									</li>
								);
							})}
						</ul>
					)}
					{css.trim() && candidates.length === 0 && (
						<p className="text-control text-muted-foreground">
							No custom properties found.
						</p>
					)}
					<div className="flex justify-end gap-1">
						<Dialog.Close className="h-7 rounded-md px-3 text-control hover:bg-hover">
							Cancel
						</Dialog.Close>
						<button
							type="button"
							disabled={chosen.length === 0}
							onClick={apply}
							className="h-7 rounded-md bg-primary px-3 text-control font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
						>
							Import {chosen.length || ""}{" "}
							{chosen.length === 1 ? "token" : "tokens"}
						</button>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
