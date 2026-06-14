import { onDomainEvent } from "@/shared/server/events";
import { applyInvitationRole } from "./invitations";

/** Wires invitation-side reactions to domain events. Called from the app-shell
 * composition; keeps auth from importing the invitations slice. */
export function registerInvitationEventHandlers(): void {
	onDomainEvent("userEmailVerified", ({ userId, email }) =>
		applyInvitationRole(userId, email),
	);
}
