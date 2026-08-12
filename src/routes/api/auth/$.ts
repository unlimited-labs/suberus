import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/features/auth/server/auth.server";
import { normalizeLoopbackRedirect } from "@/features/auth/server/loopback-redirect";

// better-auth passes `ctx.request?.clone()` to callbacks (e.g.
// sendVerificationEmail, see better-auth PR #9619). Under concurrent load the
// srvx lazy request's body can be disturbed/locked at that moment, making
// clone() throw `TypeError: unusable` and 500 the whole auth request (signup
// succeeded server-side but the client never left /register). Buffer the body
// once and make clone() mint a fresh Request so it can never throw.
// Remove once better-auth guards that clone() call upstream.
async function clonableRequest(request: Request): Promise<Request> {
	const buf = await request.arrayBuffer();
	const body = buf.byteLength > 0 ? buf : undefined;
	const make = () =>
		new Request(request.url, {
			method: request.method,
			headers: request.headers,
			body,
		});
	const req = make();
	Object.defineProperty(req, "clone", { value: make });
	return req;
}

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				return await auth.handler(await normalizeLoopbackRedirect(request));
			},
			POST: async ({ request }) => {
				return await auth.handler(
					await clonableRequest(await normalizeLoopbackRedirect(request)),
				);
			},
		},
	},
});
