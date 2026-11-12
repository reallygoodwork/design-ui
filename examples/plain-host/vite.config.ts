import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// No Tailwind here: the editor is styled only by dist/styles.css.
export default defineConfig({
	root: __dirname,
	plugins: [react()],
	server: { port: 5190, strictPort: true, fs: { allow: ["../.."] } },
});
