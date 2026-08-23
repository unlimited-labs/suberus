import { eslintCompatPlugin } from "@oxlint/plugins";
import plugin from "@tanstack/eslint-plugin-router";

export default eslintCompatPlugin({
	meta: { name: "tanstack-router" },
	rules: plugin.rules,
});
