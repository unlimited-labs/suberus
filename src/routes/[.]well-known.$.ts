import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/features/auth/server/auth.server";

// MCP clients probe RFC 9728/8414 metadata at the site root, but better-auth
// only serves it from inside its own handler, matched on the request path. So
// the untouched request is forwarded rather than the metadata rebuilt here.
const serve = ({ request }: { request: Request }) => auth.handler(request);

export const Route = createFileRoute("/.well-known/$")({
	server: { handlers: { GET: serve, HEAD: serve } },
});
