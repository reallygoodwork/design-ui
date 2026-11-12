import { describe, expect, it } from "vitest";
import { layerCssText } from "./cssText";

describe("layerCssText", () => {
	it("writes one declaration per line, in kebab case", () => {
		expect(
			layerCssText({
				selector: ".title",
				styles: { fontSize: "48px", lineHeight: "52px" },
				tokenVars: {},
			})
		).toBe(".title {\n  font-size: 48px;\n  line-height: 52px;\n}");
	});

	it("defines the tokens it uses in a :root block, and only those", () => {
		const text = layerCssText({
			selector: ".title",
			styles: { color: "var(--color-text-primary)" },
			tokenVars: {
				"--color-text-primary": "#18181b",
				"--color-unused": "red",
			},
			comment: "Desktop",
		});
		expect(text).toBe(
			"/* Desktop */\n\n:root {\n  --color-text-primary: #18181b;\n}\n\n.title {\n  color: var(--color-text-primary);\n}"
		);
	});

	it("skips undefined values and keeps custom properties as they are", () => {
		expect(
			layerCssText({
				selector: ".x",
				styles: { "--gap": "4px", color: undefined },
				tokenVars: {},
			})
		).toBe(".x {\n  --gap: 4px;\n}");
	});
});
