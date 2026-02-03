import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
	optimizeDeps: {
		include: ["@tabler/icons-react", "countries-list"],
	},
	plugins: [
		devtools(),
		nitro({
			rollupConfig: {
				external: [/^@prisma\//, /\.wasm$/, "pg", "pg-pool"],
				onwarn(warning, warn) {
					if (
						warning.code === "MODULE_LEVEL_DIRECTIVE" || // "use client" directives
						warning.code === "EMPTY_BUNDLE" // Empty chunks from tree-shaking
					) {
						return;
					}
					warn(warning);
				},
			},
		}),
		// this is the plugin that enables path aliases
		viteTsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
		tailwindcss(),
		tanstackStart(),
		viteReact({
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
		}),
	],
});

export default config;
