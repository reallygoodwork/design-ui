import type { StorybookConfig } from "@storybook/react-vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
	stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
	addons: [],
	framework: "@storybook/react-vite",
	async viteFinal(config) {
		// Update build target to support big integers (ES2022+)
		config.build = config.build || {};
		config.build.target = "es2022";

		// Configure esbuild to support big integers
		config.esbuild = config.esbuild || {};
		config.esbuild.target = "es2022";

		// Configure optimizeDeps esbuild options to support big integers
		// This is critical for Storybook's internal runtime code
		config.optimizeDeps = config.optimizeDeps || {};
		config.optimizeDeps.esbuildOptions = {
			...(config.optimizeDeps.esbuildOptions || {}),
			target: "es2022",
		};

		// Add resolve alias to use stub files when MSW is not installed
		config.resolve = config.resolve || {};
		config.resolve.alias = {
			...(config.resolve.alias || {}),
			"msw/browser": path.resolve(__dirname, "./msw-stubs/browser.ts"),
			"msw/core/http": path.resolve(__dirname, "./msw-stubs/core-http.ts"),
		};

		return config;
	},
};
export default config;
