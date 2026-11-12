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
		environment: "jsdom",
	},
});
