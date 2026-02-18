import type { UserConfig } from "@commitlint/types";

const configuration: UserConfig = {
	extends: ["@commitlint/config-conventional"],
	formatter: "@commitlint/format",
};

export default configuration;
