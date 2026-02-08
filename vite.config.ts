import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import type { RollupConfig } from "nitro/types";
import { type NitroPluginConfig, nitro } from "nitro/vite";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const isDev = process.env.NODE_ENV !== "production";

const rollupConfig: Partial<RollupConfig> = {
	external: [/^@prisma\//, /\.wasm$/, "pg", "pg-pool"],
	onwarn(warning, log) {
		if (
			warning.code === "MODULE_LEVEL_DIRECTIVE" || // "use client" directives
			warning.code === "EMPTY_BUNDLE" // Empty chunks from tree-shaking
		) {
			return;
		}
		log(warning);
	},
};

const nitroConfig: NitroPluginConfig = {
	rollupConfig,
	experimental: { tasks: true } as never,
	scheduledTasks: {
		"*/5 * * * *": isDev ? [] : ["mails:reminder", "assignments:overdue"],
	},
	scanDirs: ["./src"],
};

const config = defineConfig({
	optimizeDeps: {
		include: ["@tabler/icons-react", "countries-list"],
	},
	server: {
		hmr: {
			// Disable error overlay during E2E tests to prevent blocking page interaction
			overlay: process.env.E2E !== "true",
		},
	},
	plugins: [
		devtools(),
		nitro(nitroConfig),
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
