import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import pkg from "./package.json" with { type: "json" };

/** Packages and their subpaths (like `@xyflow/react/dist/style.css`) stay imports. */
const external = [
	...Object.keys(pkg.dependencies),
	...Object.keys(pkg.peerDependencies),
].map((name) => new RegExp(`^${name}(/.*)?$`));

/**
 * One ES module for the editor. Styles ship separately as styles.css
 * (scripts/build-css.ts), so no Tailwind runs here.
 */
export default defineConfig({
	plugins: [react()],
	resolve: { conditions: ["@design-ui/source"] },
	build: {
		lib: { entry: "src/index.ts", formats: ["es"], fileName: "index" },
		rollupOptions: { external },
		outDir: "dist",
		target: "es2022",
		sourcemap: false,
		minify: false,
	},
});
