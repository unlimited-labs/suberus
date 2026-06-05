import { execSync } from "child_process";

/**
 * Stop spawned app-server processes (and their trees). Windows uses taskkill /T
 * to reach child processes; elsewhere SIGTERM then SIGKILL for survivors.
 */
export async function killPids(pids: number[]) {
	if (pids.length === 0) return;

	if (process.platform === "win32") {
		for (const pid of pids) {
			try {
				execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
			} catch {
				// already exited
			}
		}
		return;
	}

	for (const pid of pids) {
		try {
			process.kill(pid, "SIGTERM");
		} catch {
			// already exited
		}
	}
	await new Promise((r) => setTimeout(r, 1500));
	for (const pid of pids) {
		try {
			process.kill(pid, 0); // probe; throws if gone
			process.kill(pid, "SIGKILL");
		} catch {
			// already exited
		}
	}
}
