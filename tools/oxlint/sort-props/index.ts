import { eslintCompatPlugin } from "@oxlint/plugins";
import jsxSortProps from "eslint-plugin-react/lib/rules/jsx-sort-props.js";

// oxc will not implement jsx-sort-props (oxc-project/oxc#1022: stylistic, "use Oxfmt
// or a JS plugin"), and oxfmt sorts imports/tailwind/package.json only.
export default eslintCompatPlugin({
	meta: { name: "sort-props" },
	rules: { "jsx-sort-props": jsxSortProps },
});
