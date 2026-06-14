import { registerInvitationEventHandlers } from "@/features/invitations/server/event-handlers";
import { registerSettingsEmailFooter } from "@/features/settings/server/email-footer";
import { registerSubmissionEventHandlers } from "@/features/submissions/server/event-handlers";

// App-shell composition module: wires feature server handlers to shared
// infrastructure (domain events, email footer). Lives at the src/ root — the
// composition tier, NOT a boundary zone and NOT the nitro src/server/ dir — so
// feature imports stay out of shared/server. Resolved once, lazily, via
// shared/server/composition.ensureServerComposition. Server-only.
let registered = false;

export function registerServerComposition(): void {
	if (registered) return;
	registered = true;
	registerSubmissionEventHandlers();
	registerInvitationEventHandlers();
	registerSettingsEmailFooter();
}
