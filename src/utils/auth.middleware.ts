import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../../auth";

async function requireAuth() {
	const session = await auth.api.getSession({ headers: getRequestHeaders() });
	if (!session?.user) {
		throw new Response("Unauthorized", { status: 401 });
	}
	return session.user;
}

async function requireAdmin() {
	const user = await requireAuth();
	if (!user.role || !["ADMIN", "EDITOR"].includes(user.role)) {
		throw new Response("Forbidden", { status: 403 });
	}
	return user;
}

export const authMiddleware = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		const user = await requireAuth();
		return next({ context: { user } });
	},
);

export const adminMiddleware = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		const user = await requireAdmin();
		return next({ context: { user } });
	},
);
