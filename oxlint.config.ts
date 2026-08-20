import { defineConfig } from "oxlint";

// oxlint carries the anti-slop plugin only; Biome remains the general linter.
export default defineConfig({
	plugins: [],
	categories: { correctness: "off" },
	ignorePatterns: [
		"src/routeTree.gen.ts",
		"src/generated/**",
		"src/shared/ui/**",
		"tools/oxlint/anti-slop/**",
		"scripts/**",
		"e2e/**",
		"**/*.test.ts",
		"**/*.test.tsx",
		"**/*.spec.ts",
		".agents/**",
		".claude/**",
		".codex/**",
		".cursor/**",
		".gemini/**",
	],
	jsPlugins: [{ name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" }],
	rules: {
		"anti-slop/no-chained-type-assertions": "error",
		"anti-slop/no-conditional-empty-object-spread": "error",
		"anti-slop/no-known-value-widening": "error",
		// Off: every hit is a test-file `vi.mock`, and those are out of scope above.
		"anti-slop/no-module-mocking": "off",
		"anti-slop/no-object-parameters": "error",
		"anti-slop/no-reflect-apply": "error",
		"anti-slop/no-reflect-get": "error",
		"anti-slop/no-runtime-typeof": ["error", { allowInTypeGuards: true }],
		// Off: a substring ban with no escape hatch, and most hits are zod's `.shape`.
		"anti-slop/no-shape-in-symbol-names": "off",
		"anti-slop/no-unknown-parameters": "error",
		"anti-slop/no-unknown-returns": "error",
		"anti-slop/no-unknown-type-aliases": "error",
		"anti-slop/no-unsafe-dictionary-type": "error",
		"anti-slop/no-widen-then-assert": "error",
		"anti-slop/require-safety-comment-for-type-assertion": "error",
	},
});
