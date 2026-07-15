import { registerSubmissionEventHandlers } from "@/features/submissions/server/event-handlers";

// App-shell composition module: wires feature server handlers to shared
// infrastructure (domain events). Lives at the src/ root — the
// composition tier, NOT a boundary zone — so feature imports stay out of
// shared/server. Invoked once at startup by the register-composition nitro
// plugin (eager registration avoids a shared->src dynamic import that perturbs
// the SSR bundle order). Server-only.
//
// Registration here runs ONLY in the entry chunk. Anything the bundler
// duplicates into another chunk (e.g. shared/server/email) will not see it —
// resolve such config statelessly at call time instead.
let registered = false;

export function registerServerComposition(): void {
	if (registered) return;
	registered = true;
	registerSubmissionEventHandlers();
}
