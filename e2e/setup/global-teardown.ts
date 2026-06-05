import { existsSync, readFileSync, rmSync } from "fs";
import { PIDS_FILE } from "./global-setup";
import { killPids } from "./server-control";

// Stop the per-worker app servers spawned by global-setup.
async function globalTeardown() {
	if (!existsSync(PIDS_FILE)) return;
	let pids: number[] = [];
	try {
		pids = JSON.parse(readFileSync(PIDS_FILE, "utf8"));
	} catch {
		// ignore malformed file
	}
	await killPids(pids);
	rmSync(PIDS_FILE, { force: true });
	console.log("✅ Global teardown: stopped E2E servers");
}

export default globalTeardown;
