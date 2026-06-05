import { execSync } from "child_process";
import { existsSync, readFileSync, rmSync } from "fs";
import { PIDS_FILE } from "./global-setup";

// Stop the per-worker app servers spawned by global-setup.
async function globalTeardown() {
	if (!existsSync(PIDS_FILE)) return;
	let pids: number[] = [];
	try {
		pids = JSON.parse(readFileSync(PIDS_FILE, "utf8"));
	} catch {
		// ignore malformed file
	}
	for (const pid of pids) {
		try {
			if (process.platform === "win32") {
				execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
			} else {
				process.kill(pid, "SIGTERM");
			}
		} catch {
			// already exited
		}
	}
	rmSync(PIDS_FILE, { force: true });
	console.log("✅ Global teardown: stopped E2E servers");
}

export default globalTeardown;
