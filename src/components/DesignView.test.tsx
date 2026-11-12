import { exportHtml, type RenderableDocument } from "@design-ui/core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { breakpoints } from "../test/fixtures";
import { DesignView } from "./DesignView";

const doc: RenderableDocument = {
	breakpoints,
	layers: [
		{
			id: "title",
			name: "Title",
			type: "text",
			value: "Hello",
			elementType: "h1",
			cssVars: { "--color": "var(--ink)" },
		},
	],
	tokens: [
		{
			path: "ink",
			type: "color",
			tier: "semantic",
			value: "#111",
			modes: [{ when: { theme: "dark" }, value: "#eee" }],
		},
	],
	tokenDimensions: { theme: ["light", "dark"] },
};

afterEach(cleanup);

describe("DesignView", () => {
	it("renders the same markup and styles as the export, scoped to its own root", () => {
		const { container } = render(<DesignView document={doc} />);
		const root = container.querySelector("div") as HTMLElement;
		const rootClass = root.className;
		expect(rootClass).toMatch(/^design-/);
		const exported = exportHtml(doc, { rootClass });
		expect(root.outerHTML).toBe(exported.html);
		expect(container.querySelector("style")?.textContent).toBe(exported.css);
	});

	it("gives each instance its own root, so two designs can share a page", () => {
		const { container } = render(
			<>
				<DesignView document={doc} />
				<DesignView document={doc} />
			</>
		);
		const roots = [...container.querySelectorAll(":scope > div")].map(
			(el) => el.className
		);
		expect(new Set(roots).size).toBe(2);
	});

	it("shows a token mode through data attributes on the root", () => {
		const { container } = render(
			<DesignView document={doc} mode={{ theme: "dark" }} />
		);
		const root = container.querySelector("div") as HTMLElement;
		expect(root.dataset.theme).toBe("dark");
		expect(container.querySelector("style")?.textContent).toContain(
			`.${root.className}[data-theme="dark"]{--ink:#eee`
		);
	});
});
