/**
 * Builds the editor's stylesheet for apps that don't use Tailwind:
 * build/styles.css. Everything in it applies only inside an element with the
 * `ds` class (the editor's root, and the layer its popups open in), so the
 * host page's own styles are left alone, and the host's styles can't
 * outrank the editor's.
 *
 *   bun run build:css
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compile, optimize } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import postcss, { type Root, type Rule } from "postcss";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ENTRY = join(ROOT, "src/styles/package.css");
const OUT = join(ROOT, "build/styles.css");

/** The editor's root. */
export const SCOPE = ".ds";

/** Where a selector's trailing pseudo-element starts, skipping escaped colons in class names. */
const pseudoElementAt = (selector: string) => {
	for (let i = selector.length - 2; i >= 0; i--) {
		if (selector[i] === " " || selector[i] === ">") return -1;
		if (selector.startsWith("::", i) && selector[i - 1] !== "\\") return i;
	}
	return -1;
};

/** `S` on the root itself: `.ds` joined to the last compound, before any `::before`. */
const onRoot = (selector: string) => {
	const at = pseudoElementAt(selector);
	if (at === -1) return `${selector}${SCOPE}`;
	const head = selector.slice(0, at);
	// A bare `::before` means any element's: the root's is `.ds::before`.
	return `${head}${SCOPE}${selector.slice(at)}`;
};

/** One selector made to match only inside the editor, or the root itself. */
export const scopeSelector = (selector: string): string[] => {
	const s = selector.trim();
	if (s === SCOPE) return [s];
	if (s === ":root" || s === ":host" || s === "html" || s === "body")
		return [SCOPE];
	// Dark mode is a `.dark` class on the root or above it.
	if (s === ".dark") return [`.dark ${SCOPE}`, `${SCOPE}.dark`];
	return [`${SCOPE} ${s}`, onRoot(s)];
};

const insideKeyframes = (rule: Rule) => {
	let parent = rule.parent;
	while (parent && parent.type !== "root") {
		if (parent.type === "atrule" && /keyframes$/.test(parent.name)) return true;
		parent = parent.parent;
	}
	return false;
};

/**
 * Scopes every rule to the editor, and takes rules out of cascade layers:
 * a host's unlayered CSS would otherwise beat all of it, whatever its
 * specificity.
 */
export const scope = (root: Root) => {
	root.walkRules((rule) => {
		if (insideKeyframes(rule)) return;
		rule.selectors = [...new Set(rule.selectors.flatMap(scopeSelector))];
	});
	root.walkAtRules("layer", (at) => {
		if (at.nodes) at.replaceWith(at.nodes);
		else at.remove();
	});
	return root;
};

const build = async () => {
	const css = readFileSync(ENTRY, "utf8");
	const compiler = await compile(css, {
		base: dirname(ENTRY),
		from: ENTRY,
		onDependency: () => {},
	});
	const scanner = new Scanner({ sources: compiler.sources });
	const compiled = compiler.build(scanner.scan());
	const scoped = scope(postcss.parse(compiled)).toString();
	const { code } = optimize(scoped, { file: "styles.css", minify: false });
	mkdirSync(dirname(OUT), { recursive: true });
	writeFileSync(OUT, code);
	console.log(
		`Wrote ${OUT.replace(ROOT, "")} (${(code.length / 1024).toFixed(0)} KB)`
	);
};

if (import.meta.main) await build();
