/**
 * Minimal typed domain-event bus. Lets core/app features react to cross-cutting
 * lifecycle events without the emitter importing them: the emitting slice calls
 * emitDomainEvent, handlers are wired at startup by the register-composition
 * nitro plugin. Server-only.
 */
export interface DomainEvents {
	/** Fired after a user's email becomes verified (self-service or admin). */
	userEmailVerified: { userId: string; email: string };
}

type Handler<P> = (payload: P) => Promise<void> | void;

const handlers: { [K in keyof DomainEvents]: Handler<DomainEvents[K]>[] } = {
	userEmailVerified: [],
};

export function onDomainEvent<K extends keyof DomainEvents>(
	name: K,
	handler: Handler<DomainEvents[K]>,
): void {
	handlers[name].push(handler);
}

/** Awaits every handler sequentially (handlers are independent + idempotent). */
export async function emitDomainEvent<K extends keyof DomainEvents>(
	name: K,
	payload: DomainEvents[K],
): Promise<void> {
	for (const handler of handlers[name]) {
		await handler(payload);
	}
}
