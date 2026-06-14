import { onDomainEvent } from "@/shared/server/events";
import { linkCoAuthorsByEmail } from "./submissions";

/** Wires submission-side reactions to domain events. Called from the app-shell
 * composition; keeps auth/users from importing the submissions slice. */
export function registerSubmissionEventHandlers(): void {
	onDomainEvent("userEmailVerified", ({ userId, email }) =>
		linkCoAuthorsByEmail(email, userId),
	);
}
