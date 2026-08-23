import { eslintCompatPlugin } from "@oxlint/plugins";
import plugin from "@tanstack/eslint-plugin-query";

export default eslintCompatPlugin({
	meta: { name: "tanstack-query" },
	rules: plugin.rules,
});
