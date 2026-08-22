import { existsSync, readFileSync, rmSync } from "fs";
import { PIDS_FILE } from "./global-setup";
import { killPids } from "./server-control";

async function globalTeardown() {
	if (!existsSync(PIDS_FILE)) return;
	let pids: number[] = [];
	try {
		pids = JSON.parse(readFileSync(PIDS_FILE, "utf8"));
	} catch {
	}
	await killPids(pids);
	rmSync(PIDS_FILE, { force: true });
	console.log("✅ Global teardown: stopped E2E servers");
}

export default globalTeardown;
