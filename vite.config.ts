/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	build: {
		rollupOptions: {
			// Docs at the root, the full editor at /demo/
			input: { docs: "index.html", demo: "demo/index.html" },
		},
	},
	test: {
		projects: [
			{
				// The format runs anywhere, so its tests run in Node, not a DOM.
				extends: true,
				test: {
					name: "core",
					include: ["packages/core/**/*.test.ts"],
					environment: "node",
				},
			},
			{
				extends: true,
				test: {
					name: "editor",
					include: [
						"src/**/*.test.{ts,tsx}",
						"agent/**/*.test.ts",
						"scripts/**/*.test.ts",
					],
					environment: "jsdom",
				},
			},
		],
	},
});
