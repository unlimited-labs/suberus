import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { E2E_OUTPUT_DIR } from "../../playwright.config";

// Guards the `traceDeps: ["jsdom*"]` fix in vite.config.ts. jsdom reads its UA
// default-stylesheet.css from disk via __dirname at runtime (a v27+ change). If a
// bundler INLINES jsdom into a server chunk, that __dirname path breaks (ENOENT)
// and the version-diff normalize worker — plus the lazy redline diff — crash in
// the production build. jsdom must therefore stay EXTERNAL: traced into the output
// node_modules in exploded form with its CSS asset intact.
//
// This is a pure build-output check: no server, DB, or docx-api sidecar needed, so
// it provides PERMANENT regression coverage even in environments where the real
// DOCX-normalize E2E path is skipped (sidecar down). The sanitizer's correctness is
// covered separately by src/features/submission-diff/server/sanitize.test.ts.

const SERVER_DIR = resolve(process.cwd(), E2E_OUTPUT_DIR, "server");
const UA_STYLESHEET = join(
	SERVER_DIR,
	"node_modules/jsdom/lib/jsdom/browser/default-stylesheet.css",
);

/** All bundled server chunks (excludes the externalized node_modules tree). */
function bundledChunks(dir: string): string[] {
	if (!existsSync(dir)) return [];
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === "node_modules") continue; // externalized deps, not bundled
		const full = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...bundledChunks(full));
		else if (/\.(mjs|js)$/.test(entry.name)) out.push(full);
	}
	return out;
}

test.describe("Bundle: jsdom stays external (guards version-diff prod crash)", () => {
	test("server build output exists to assert against", () => {
		expect(
			existsSync(SERVER_DIR),
			`No server build at ${SERVER_DIR} — global-setup should have produced it`,
		).toBe(true);
	});

	test("jsdom is traced into output node_modules with its UA stylesheet asset", () => {
		expect(
			existsSync(UA_STYLESHEET),
			`jsdom UA stylesheet missing at ${UA_STYLESHEET}. jsdom was inlined instead ` +
				`of externalized — the version-diff normalize worker will ENOENT in prod. ` +
				`Ensure traceDeps: ["jsdom*"] in vite.config.ts.`,
		).toBe(true);
	});

	test("no bundled server chunk inlines jsdom's disk-read stylesheet", () => {
		// An inlined jsdom embeds the literal filename it readFileSync's at runtime.
		// Externalized jsdom never appears in a bundled chunk.
		const offenders = bundledChunks(SERVER_DIR).filter((f) =>
			readFileSync(f, "utf8").includes("default-stylesheet.css"),
		);
		expect(
			offenders,
			`Server chunks inline jsdom (embed default-stylesheet.css) — externalization ` +
				`regressed:\n${offenders.join("\n")}`,
		).toEqual([]);
	});
});
