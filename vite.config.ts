import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { type NitroPluginConfig, nitro } from "nitro/vite";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";

// const isDev = process.env.NODE_ENV !== "production";
const isE2E = process.env.E2E === "true";

const rollupConfig = {
	onwarn(
		warning: { code?: string; message: string },
		log: (warning: unknown) => void,
	) {
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
	serverDir: "server",
	experimental: { tasks: true, vite: {} },
	scheduledTasks: {
		"*/5 * * * *": isE2E
			? []
			: ["mails:reminder", "assignments:overdue", "services:health"],
	},
};

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	server: isE2E ? { hmr: { overlay: false } } : undefined,
	optimizeDeps: {
		include: ["@tabler/icons-react", "countries-list"],
	},
	plugins: [
		devtools(),
		nitro(nitroConfig),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
		babel({ presets: [reactCompilerPreset()] }),
		// Force check TS errors on build
		checker({
			typescript: {
				tsconfigPath: "./tsconfig.json",
			},
			// biome: {
			// 	command: "check",
			// },
		}),
	],
});

export default config;
