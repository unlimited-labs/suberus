import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		include: ["scripts/**/*.test.ts", "src/**/*.test.ts"],
		testTimeout: 30_000,
	},
});
