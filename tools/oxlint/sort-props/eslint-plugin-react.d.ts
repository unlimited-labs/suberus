// eslint-plugin-react types its rules as ESLint RuleModule, which does not overlap
// oxlint's Rule (different SourceCode/Context). eslintCompatPlugin bridges them at
// runtime, so declare the rule at the shape oxlint expects. Drop if oxc ever ships
// jsx-sort-props natively (oxc-project/oxc#1022 says it will not).
declare module "eslint-plugin-react/lib/rules/jsx-sort-props.js" {
	import type { Rule } from "@oxlint/plugins";
	const rule: Rule;
	export default rule;
}
