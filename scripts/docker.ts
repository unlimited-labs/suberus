import { execFileSync } from "node:child_process";

const REGISTRY = "registry.wimiip.eu";
const IMAGE_NAME = "suberus/app";
const TAG = new Date().toISOString().slice(0, 10).replace(/-/g, "");

function gitCommit(): string {
	const sha = execFileSync("git", ["rev-parse", "--short", "HEAD"]).toString().trim();
	const dirty = execFileSync("git", ["status", "--porcelain"]).toString().trim();
	return dirty ? `${sha}-dirty` : sha;
}

const GIT_COMMIT = gitCommit();
const BUILD_DATE = new Date().toISOString();

function docker(...args: Array<string>) {
	console.log(`>> docker ${args.join(" ")}`);
	execFileSync("docker", args, {
		stdio: "inherit",
		env: { ...process.env, REGISTRY, IMAGE_NAME, TAG, GIT_COMMIT, BUILD_DATE },
	});
}

console.log(`\n=== Building & pushing (TAG=${TAG}) ===`);

docker("buildx", "bake", "--push");

console.log(`\n=== Done ===`);
console.log(`  Runtime : ${REGISTRY}/${IMAGE_NAME}:${TAG}`);
console.log(`  Migrate : ${REGISTRY}/${IMAGE_NAME}:migrate-${TAG}`);
console.log(`  Docling : ${REGISTRY}/suberus/docling:${TAG}`);
console.log(`  Planner : ${REGISTRY}/suberus/planner:${TAG}`);
