import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { type NitroPluginConfig, nitro } from "nitro/vite";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import zodCompiler from "zod-compiler/vite";

const isE2E = process.env.E2E === "true";

// Optional build-output isolation: when set, Nitro writes the build here instead
// of the default `.output`. The E2E harness uses this so a concurrent `pnpm build`
// (e.g. a dev rebuild) can't clobber the assets the running E2E servers serve.
const outputDir = process.env.BUILD_OUTPUT_DIR;

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
	serverDir: "src/server",
	// Keep jsdom EXTERNAL (traced into output node_modules, exploded), not inlined.
	// jsdom reads its UA default-stylesheet.css from disk via __dirname at runtime
	// (a v27+ regression); once a bundler inlines jsdom into one file that path
	// breaks → ENOENT crashes the version-diff normalize worker (and pg-boss init).
	// Nitro 3 bundles deps by default; the `jsdom*` full-trace copies all package
	// files (incl. the CSS asset) into .output/server/node_modules.
	traceDeps: ["jsdom*"],
	output: outputDir ? { dir: outputDir } : undefined,
	experimental: { tasks: true, vite: {} },
	scheduledTasks: {
		"* * * * *": isE2E ? [] : ["program:reminders"],
		"*/5 * * * *": isE2E
			? []
			: ["mails:reminder", "assignments:overdue", "services:health"],
		// Daily GC of orphaned version-diff CAS objects (off in E2E).
		"30 3 * * *": isE2E ? [] : ["cas:reaper"],
	},
};

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	// maplibre-gl v6 is ESM-only; leaving it external breaks the SSR import.
	ssr: { noExternal: ["maplibre-gl"] },
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
		checker({
			typescript: {
				tsconfigPath: "./tsconfig.json",
			},
		}),
		zodCompiler(),
	],
});

export default config;
