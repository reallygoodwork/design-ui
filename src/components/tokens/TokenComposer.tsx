import { Popover } from "@base-ui/react/popover";
import { IconCheck, IconPlus, IconX } from "@tabler/icons-react";
import { useMemo, useRef, useState } from "react";
import { modeAt, useTokens } from "../../hooks/useTokens";
import { cn } from "../../lib/cn";
import {
	indexTokens,
	isComposed,
	referencesOf,
	resolveTokenValue,
	type TokenType,
} from "../../lib/tokens";
import { Select } from "../common/Select";
import { TokenGlyph, TokenList } from "./TokenList";
import { TokenValueField } from "./TokenValueField";

type Slot = { id: string; label: string; type: TokenType; initial: string };
type Template = {
	id: string;
	label: string;
	hint: string;
	slots: Slot[];
	build: (values: Record<string, string>) => string;
};

/**
 * Functions a composed token can be built from. Each slot takes a token of
 * its type or a typed value, so a number token can set a color's alpha.
 */
export const TEMPLATES: Record<TokenType, Template[]> = {
	color: [
		{
			id: "mix",
			label: "Mix two colors",
			hint: "color-mix() in OKLCH",
			slots: [
				{ id: "a", label: "Color", type: "color", initial: "" },
				{ id: "amount", label: "Amount", type: "number", initial: "50%" },
				{ id: "b", label: "With", type: "color", initial: "white" },
			],
			build: (v) => `color-mix(in oklch, ${v.a} ${v.amount}, ${v.b})`,
		},
		{
			id: "alpha",
			label: "Change opacity",
			hint: "Relative color: oklch(from …)",
			slots: [
				{ id: "color", label: "Color", type: "color", initial: "" },
				{ id: "alpha", label: "Opacity", type: "number", initial: "0.5" },
			],
			build: (v) => `oklch(from ${v.color} l c h / ${v.alpha})`,
		},
		{
			id: "lightness",
			label: "Lighten or darken",
			hint: "Shift OKLCH lightness",
			slots: [
				{ id: "color", label: "Color", type: "color", initial: "" },
				{ id: "amount", label: "By", type: "number", initial: "0.1" },
			],
			build: (v) => `oklch(from ${v.color} calc(l + ${v.amount}) c h)`,
		},
		{
			id: "light-dark",
			label: "Light / dark pair",
			hint: "light-dark(), follows the frame's color scheme",
			slots: [
				{ id: "light", label: "Light", type: "color", initial: "" },
				{ id: "dark", label: "Dark", type: "color", initial: "" },
			],
			build: (v) => `light-dark(${v.light}, ${v.dark})`,
		},
	],
	dimension: [
		{
			id: "multiply",
			label: "Multiply",
			hint: "calc(a × n)",
			slots: [
				{ id: "size", label: "Size", type: "dimension", initial: "" },
				{ id: "factor", label: "Times", type: "number", initial: "2" },
			],
			build: (v) => `calc(${v.size} * ${v.factor})`,
		},
		{
			id: "add",
			label: "Add",
			hint: "calc(a + b)",
			slots: [
				{ id: "a", label: "Size", type: "dimension", initial: "" },
				{ id: "b", label: "Plus", type: "dimension", initial: "" },
			],
			build: (v) => `calc(${v.a} + ${v.b})`,
		},
		{
			id: "fluid",
			label: "Fluid between two sizes",
			hint: "clamp(min, preferred, max)",
			slots: [
				{ id: "min", label: "Min", type: "dimension", initial: "" },
				{
					id: "preferred",
					label: "Preferred",
					type: "dimension",
					initial: "4vw",
				},
				{ id: "max", label: "Max", type: "dimension", initial: "" },
			],
			build: (v) => `clamp(${v.min}, ${v.preferred}, ${v.max})`,
		},
	],
	number: [
		{
			id: "multiply",
			label: "Multiply",
			hint: "calc(a × b)",
			slots: [
				{ id: "a", label: "Number", type: "number", initial: "" },
				{ id: "b", label: "Times", type: "number", initial: "2" },
			],
			build: (v) => `calc(${v.a} * ${v.b})`,
		},
	],
	fontFamily: [
		{
			id: "stack",
			label: "Fallback stack",
			hint: "First font, then the fallback",
			slots: [
				{ id: "a", label: "Font", type: "fontFamily", initial: "" },
				{
					id: "b",
					label: "Fallback",
					type: "fontFamily",
					initial: "sans-serif",
				},
			],
			build: (v) => `${v.a}, ${v.b}`,
		},
	],
	fontWeight: [],
	shadow: [
		{
			id: "tinted",
			label: "Tinted shadow",
			hint: "A shadow in a token color",
			slots: [
				{ id: "y", label: "Offset", type: "dimension", initial: "4px" },
				{ id: "blur", label: "Blur", type: "dimension", initial: "16px" },
				{ id: "color", label: "Color", type: "color", initial: "" },
			],
			build: (v) => `0 ${v.y} ${v.blur} ${v.color}`,
		},
	],
};

/** The CSS property used to check that a composed value is valid. */
const CHECK_PROPERTY: Record<TokenType, string> = {
	color: "color",
	dimension: "width",
	number: "opacity",
	fontFamily: "font-family",
	fontWeight: "font-weight",
	shadow: "box-shadow",
};

const INSERT_TYPES: TokenType[] = [
	"color",
	"dimension",
	"number",
	"fontFamily",
	"fontWeight",
	"shadow",
];
const INSERT_LABEL: Record<TokenType, string> = {
	color: "Color",
	dimension: "Size",
	number: "Number",
	fontFamily: "Font",
	fontWeight: "Weight",
	shadow: "Shadow",
};

const isValidCss = (type: TokenType, value: string | undefined) =>
	Boolean(value) &&
	typeof CSS !== "undefined" &&
	CSS.supports(CHECK_PROPERTY[type], value as string);

/**
 * Builds a token value out of other tokens: pick a function and fill its
 * slots, or write the expression with `{token.path}` references. Shows the
 * value it resolves to now, and whether the browser accepts it.
 */
export const TokenComposer = ({
	type,
	value,
	exclude,
	onApply,
}: {
	type: TokenType;
	value: string;
	exclude?: string;
	onApply: (value: string) => void;
}) => {
	const store = useTokens();
	const templates = TEMPLATES[type];
	const [tab, setTab] = useState<"function" | "expression">(
		isComposed(value) ? "expression" : "function"
	);
	const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
	const template = templates.find((t) => t.id === templateId) ?? templates[0];
	const [slots, setSlots] = useState<Record<string, string>>({});
	const [expression, setExpression] = useState(isComposed(value) ? value : "");
	const [insertType, setInsertType] = useState<TokenType>(type);
	const [inserting, setInserting] = useState(false);
	const textRef = useRef<HTMLTextAreaElement>(null);

	const slotValue = (slot: Slot) =>
		slots[`${template?.id}:${slot.id}`] ?? slot.initial;
	const built = template
		? template.slots.every((slot) => slotValue(slot).trim())
			? template.build(
					Object.fromEntries(
						template.slots.map((slot) => [slot.id, slotValue(slot)])
					)
				)
			: ""
		: "";
	const candidate = tab === "function" ? built : expression.trim();

	const byPath = useMemo(() => indexTokens(store.tokens), [store.tokens]);
	const mode = modeAt(store, store.breakpointOrder[0]);
	const result = candidate
		? resolveTokenValue(candidate, mode, byPath, store.breakpointOrder, type)
		: undefined;
	const refs = referencesOf(candidate);
	const selfReference = exclude ? refs.includes(exclude) : false;
	const valid = Boolean(
		result && !result.error && !selfReference && isValidCss(type, result.value)
	);

	const insert = (path: string) => {
		const el = textRef.current;
		const token = `{${path}}`;
		const at = el?.selectionStart ?? expression.length;
		const end = el?.selectionEnd ?? at;
		setExpression(expression.slice(0, at) + token + expression.slice(end));
		setInserting(false);
		requestAnimationFrame(() => {
			el?.focus();
			el?.setSelectionRange(at + token.length, at + token.length);
		});
	};

	return (
		<div className="flex flex-col gap-2.5">
			<div
				role="tablist"
				aria-label="Compose with"
				className="grid grid-cols-2 rounded-md bg-muted p-[3px]"
			>
				{(["function", "expression"] as const).map((t) => (
					<button
						key={t}
						type="button"
						role="tab"
						aria-selected={tab === t}
						onClick={() => setTab(t)}
						className={cn(
							"h-6 rounded-sm text-control capitalize text-muted-foreground hover:text-foreground",
							tab === t && "bg-raised text-foreground shadow-xs"
						)}
					>
						{t}
					</button>
				))}
			</div>

			{tab === "function" && template ? (
				<div className="flex flex-col gap-1.5">
					<Select
						ariaLabel="Function"
						className="justify-between font-sans text-control"
						value={template.id}
						items={templates.map((t) => ({ label: t.label, value: t.id }))}
						onValueChange={setTemplateId}
					/>
					<p className="text-caption text-muted-foreground">{template.hint}</p>
					{template.slots.map((slot) => (
						<div
							key={slot.id}
							className="grid grid-cols-[64px_1fr] items-center gap-2"
						>
							<span className="text-caption text-muted-foreground">
								{slot.label}
							</span>
							<TokenValueField
								live
								noCompose
								label={`${template.label}: ${slot.label}`}
								type={slot.type}
								value={slotValue(slot)}
								exclude={exclude}
								placeholder="Pick a token or type"
								onCommit={(next) =>
									setSlots((prev) => ({
										...prev,
										[`${template.id}:${slot.id}`]: next,
									}))
								}
							/>
						</div>
					))}
				</div>
			) : (
				<div className="flex flex-col gap-1.5">
					<textarea
						ref={textRef}
						aria-label="Expression"
						value={expression}
						onChange={(event) => setExpression(event.target.value)}
						spellCheck={false}
						placeholder="color-mix(in oklch, {color.brand} 40%, white)"
						className="h-20 resize-none rounded-md bg-input p-2 font-mono text-value outline-none focus-visible:ring-2 focus-visible:ring-ring"
					/>
					<Popover.Root open={inserting} onOpenChange={setInserting}>
						<Popover.Trigger className="flex h-6 items-center gap-1 self-start rounded-md px-1.5 text-control text-muted-foreground hover:bg-hover hover:text-foreground">
							<IconPlus className="size-3.5" />
							Insert token
						</Popover.Trigger>
						<Popover.Portal>
							<Popover.Positioner
								side="right"
								align="start"
								sideOffset={12}
								collisionPadding={8}
							>
								<Popover.Popup className="ds-popup ds-surface z-50 flex w-72 flex-col gap-2 p-3 outline-hidden">
									<div
										role="tablist"
										aria-label="Token type"
										className="flex flex-wrap gap-0.5"
									>
										{INSERT_TYPES.filter((t) =>
											store.tokens.some((token) => token.type === t)
										).map((t) => (
											<button
												key={t}
												type="button"
												role="tab"
												aria-selected={insertType === t}
												onClick={() => setInsertType(t)}
												className={cn(
													"h-6 rounded-md px-2 text-control text-muted-foreground hover:text-foreground",
													insertType === t && "bg-selected text-foreground"
												)}
											>
												{INSERT_LABEL[t]}
											</button>
										))}
									</div>
									<TokenList
										key={insertType}
										className="max-h-64"
										type={insertType}
										exclude={exclude}
										onPick={insert}
									/>
								</Popover.Popup>
							</Popover.Positioner>
						</Popover.Portal>
					</Popover.Root>
				</div>
			)}

			{refs.length > 0 && (
				<ul aria-label="Reads" className="flex flex-wrap gap-1">
					{refs.map((ref) => {
						const known = byPath.has(ref) && ref !== exclude;
						return (
							<li
								key={ref}
								className={cn(
									"rounded px-1.5 py-px font-mono text-caption",
									known
										? "bg-accent/10 text-accent-text"
										: "bg-destructive/12 text-destructive"
								)}
							>
								{ref}
							</li>
						);
					})}
				</ul>
			)}

			<div className="flex flex-col gap-1 rounded-md bg-input/60 p-2">
				<span className="flex items-center gap-2 text-control">
					<TokenGlyph type={type} value={valid ? result?.value : undefined} />
					<span
						className="min-w-0 flex-1 truncate font-mono text-value"
						title={result?.value}
					>
						{result?.value ?? "—"}
					</span>
				</span>
				<span
					className={cn(
						"flex items-center gap-1 text-caption",
						valid ? "text-muted-foreground" : "text-destructive"
					)}
				>
					{candidate ? (
						valid ? (
							<>
								<IconCheck className="size-3" /> Valid CSS, follows every token
								it reads
							</>
						) : (
							<>
								<IconX className="size-3" />
								{selfReference
									? "It can't read itself"
									: result?.error?.kind === "unresolved"
										? `{${result.error.missing}} isn't a token`
										: result?.error?.kind === "circular"
											? "That makes a loop"
											: "The browser can't read this"}
							</>
						)
					) : (
						"Fill in every slot"
					)}
				</span>
			</div>

			<button
				type="button"
				disabled={!valid}
				onClick={() => onApply(candidate)}
				className="h-7 rounded-md bg-primary text-control font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
			>
				Use this value
			</button>
		</div>
	);
};
