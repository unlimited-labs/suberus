import { registerInvitationEventHandlers } from "@/features/invitations/server/event-handlers";
import { registerSettingsEmailFooter } from "@/features/settings/server/email-footer";
import { registerSubmissionEventHandlers } from "@/features/submissions/server/event-handlers";

// App-shell composition module: wires feature server handlers to shared
// infrastructure (domain events, email footer). Lives at the src/ root — the
// composition tier, NOT a boundary zone — so feature imports stay out of
// shared/server. Invoked once at startup by the register-composition nitro
// plugin (eager registration avoids a shared->src dynamic import that perturbs
// the SSR bundle order). Server-only.
let registered = false;

export function registerServerComposition(): void {
	if (registered) return;
	registered = true;
	registerSubmissionEventHandlers();
	registerInvitationEventHandlers();
	registerSettingsEmailFooter();
}
