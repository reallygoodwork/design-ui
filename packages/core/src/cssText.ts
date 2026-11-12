const kebab = (property: string) =>
	property.startsWith("--")
		? property
		: property.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Custom properties a value reads, e.g. `--color-text` in `var(--color-text)`. */
const varsIn = (value: string) =>
	[...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);

/**
 * One layer's CSS as text: a rule for the layer, preceded by a `:root` block
 * defining every token it uses, so the snippet works when pasted elsewhere.
 */
export const layerCssText = ({
	selector,
	styles,
	tokenVars,
	comment,
}: {
	selector: string;
	styles: Record<string, string | number | undefined>;
	/** Resolved token custom properties, e.g. `{ "--color-text": "#18181b" }`. */
	tokenVars: Record<string, string>;
	comment?: string;
}) => {
	const declarations = Object.entries(styles).filter(
		(entry): entry is [string, string | number] => entry[1] !== undefined
	);
	const used = [
		...new Set(declarations.flatMap(([, value]) => varsIn(String(value)))),
	].filter((name) => name in tokenVars);

	const block = (sel: string, lines: string[]) =>
		`${sel} {\n${lines.map((line) => `  ${line}`).join("\n")}\n}`;

	const parts = [
		comment ? `/* ${comment} */` : "",
		used.length
			? block(
					":root",
					used.map((name) => `${name}: ${tokenVars[name]};`)
				)
			: "",
		block(
			selector,
			declarations.map(([property, value]) => `${kebab(property)}: ${value};`)
		),
	];
	return parts.filter(Boolean).join("\n\n");
};
