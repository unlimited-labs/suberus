// The TanStack plugins type their rules as ESLint RuleModule, which does not overlap
// oxlint's Rule (different Context/SourceCode). eslintCompatPlugin bridges them at
// runtime; declare them at the shape oxlint expects instead of casting.
declare module "@tanstack/eslint-plugin-query" {
	import type { Rule } from "@oxlint/plugins";
	const plugin: { rules: Record<string, Rule> };
	export default plugin;
}
declare module "@tanstack/eslint-plugin-router" {
	import type { Rule } from "@oxlint/plugins";
	const plugin: { rules: Record<string, Rule> };
	export default plugin;
}
