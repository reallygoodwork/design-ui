import { defineConfig } from "vite";

/** One ES module for the format; its dependencies stay external. */
export default defineConfig({
	build: {
		lib: { entry: "src/index.ts", formats: ["es"], fileName: "index" },
		rollupOptions: { external: [/^culori/, /^zod/] },
		outDir: "dist",
		target: "es2022",
		sourcemap: false,
		minify: false,
	},
});
