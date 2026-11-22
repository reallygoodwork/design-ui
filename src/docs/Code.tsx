import { cn } from "@design-ui/react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { type ReactNode, useState } from "react";

const TOKENS =
	/(\/\/.*|\{\/\*.*\*\/\})|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(import|from|export|const|let|return|function|type|satisfies|default|if|else|new|as|true|false|null|useEffect|useRef)\b|(<\/?[A-Z][\w.]*)|\b(\d+(?:\.\d+)?)\b/g;

const CLASS_BY_GROUP = [
	"tok-comment",
	"tok-string",
	"tok-keyword",
	"tok-tag",
	"tok-number",
];

const highlightLine = (line: string): ReactNode[] => {
	const out: ReactNode[] = [];
	let last = 0;
	for (const match of line.matchAll(TOKENS)) {
		const index = match.index;
		if (index > last) out.push(line.slice(last, index));
		const group = match.slice(1).findIndex((value) => value !== undefined);
		out.push(
			<span key={index} className={CLASS_BY_GROUP[group]}>
				{match[0]}
			</span>
		);
		last = index + match[0].length;
	}
	if (last < line.length) out.push(line.slice(last));
	return out;
};

/** Paths in the shown examples read as if the file sits directly in `src/`. */
export const displaySource = (raw: string) =>
	raw.replaceAll('"../../', '"./').trimEnd();

export const CopyButton = ({
	text,
	label = "Copy code",
	className,
}: {
	text: string;
	label?: string;
	className?: string;
}) => {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type="button"
			aria-label={copied ? "Copied" : label}
			className={cn(
				"grid size-7 shrink-0 place-items-center rounded-md text-zinc-400 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white",
				className
			)}
			onClick={() => {
				navigator.clipboard.writeText(text).then(() => {
					setCopied(true);
					setTimeout(() => setCopied(false), 1400);
				});
			}}
		>
			{copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
		</button>
	);
};

export const Code = ({
	code,
	copyText = code,
	title,
	copy = true,
	partForLine,
	activePart,
	onPartChange,
	className,
}: {
	code: string;
	/** What the copy button copies, when the shown code is an excerpt. */
	copyText?: string;
	title?: string;
	copy?: boolean;
	/** Link lines to a part id, for the anatomy diagram. */
	partForLine?: (line: string) => string | null;
	activePart?: string | null;
	onPartChange?: (part: string | null) => void;
	className?: string;
}) => {
	const lines = code.split("\n");
	return (
		<div
			className={cn("relative min-w-0 rounded-lg bg-(--ds-code)", className)}
			style={{ color: "var(--code-text)" }}
		>
			{title && (
				<div className="border-white/10 border-b px-4 py-2 text-xs text-zinc-400">
					{title}
				</div>
			)}
			{copy && (
				<CopyButton
					text={copyText}
					className={cn("absolute right-2", title ? "top-1" : "top-2")}
				/>
			)}
			<pre className="overflow-x-auto py-4 text-[13px] leading-[1.65]">
				<code className="block w-fit min-w-full">
					{lines.map((line, index) => {
						const part = partForLine?.(line) ?? null;
						return (
							// biome-ignore lint/a11y/noStaticElementInteractions: hover only mirrors the labelled buttons in the diagram
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: lines of a static string
								key={index}
								className={cn(
									"block px-4",
									part && "transition-colors",
									part && part === activePart && "bg-[#155dfc]/45"
								)}
								onMouseEnter={part ? () => onPartChange?.(part) : undefined}
								onMouseLeave={part ? () => onPartChange?.(null) : undefined}
							>
								{line ? highlightLine(line) : " "}
							</span>
						);
					})}
				</code>
			</pre>
		</div>
	);
};
