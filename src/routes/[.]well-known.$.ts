import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/features/auth/server/auth.server";

// Clients probe RFC 9728/8414 metadata at the site root; better-auth serves it
// only from its own handler, matched on path — so forward, never rebuild.
const serve = ({ request }: { request: Request }) => auth.handler(request);

export const Route = createFileRoute("/.well-known/$")({
	server: { handlers: { GET: serve, HEAD: serve } },
});
