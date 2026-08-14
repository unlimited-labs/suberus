import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/features/auth/server/auth.server";

async function requireAuth() {
	const session = await auth.api.getSession({ headers: getRequestHeaders() });
	if (!session?.user) {
		throw new Response("Unauthorized", { status: 401 });
	}
	return session.user;
}

/** Roles that may reach the admin surface — server functions, API routes, MCP. */
export const ADMIN_ROLES: readonly string[] = ["ADMIN", "EDITOR"];

export function hasAdminRole(role: string | null | undefined): boolean {
	return role != null && ADMIN_ROLES.includes(role);
}

async function requireAdmin() {
	const user = await requireAuth();
	if (!hasAdminRole(user.role)) {
		throw new Response("Forbidden", { status: 403 });
	}
	return user;
}

async function requireAdminOnly() {
	const user = await requireAuth();
	if (user.role !== "ADMIN") {
		throw new Response("Forbidden", { status: 403 });
	}
	return user;
}

/** Route-side auth: redirect (not 403) unauthenticated users to login. */
async function requireRouteUser() {
	const session = await auth.api.getSession({ headers: getRequestHeaders() });
	if (!session?.user) {
		throw redirect({ to: "/login" });
	}
	return session.user;
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

export const adminOnlyMiddleware = createMiddleware({
	type: "function",
}).server(async ({ next }) => {
	const user = await requireAdminOnly();
	return next({ context: { user } });
});

/** Route middleware - redirects unauthenticated users to login */
export const authRouteMiddleware = createMiddleware().server(
	async ({ next }) => {
		const user = await requireRouteUser();
		return next({ context: { user } });
	},
);

/** Route middleware - redirects non-admin users to dashboard */
export const adminRouteMiddleware = createMiddleware().server(
	async ({ next }) => {
		const user = await requireRouteUser();
		if (!hasAdminRole(user.role)) {
			throw redirect({ to: "/" });
		}
		return next({ context: { user } });
	},
);

/** Route middleware - redirects non-ADMIN users (incl. editors) to the admin dashboard */
export const adminOnlyRouteMiddleware = createMiddleware().server(
	async ({ next }) => {
		const user = await requireRouteUser();
		if (user.role !== "ADMIN") {
			throw redirect({ to: "/admin/dashboard" });
		}
		return next({ context: { user } });
	},
);

/** Route middleware - exhibitor panel; redirects non-exhibitor users to dashboard */
export const exhibitorRouteMiddleware = createMiddleware().server(
	async ({ next }) => {
		const user = await requireRouteUser();
		if (user.role !== "EXHIBITOR") {
			throw redirect({ to: "/" });
		}
		return next({ context: { user } });
	},
);

/** Route middleware - sends exhibitors to their panel (author-facing pages) */
export const redirectExhibitorRouteMiddleware = createMiddleware().server(
	async ({ next }) => {
		const session = await auth.api.getSession({
			headers: getRequestHeaders(),
		});
		if (session?.user?.role === "EXHIBITOR") {
			throw redirect({ to: "/exhibitor" });
		}
		return next();
	},
);

/** Request middleware for API routes - authenticates user */
export const authRequestMiddleware = createMiddleware().server(
	async ({ next }) => {
		const user = await requireAuth();
		return next({ context: { user } });
	},
);

/** Request middleware for API routes - requires ADMIN or EDITOR role */
export const adminRequestMiddleware = createMiddleware().server(
	async ({ next }) => {
		const user = await requireAdmin();
		return next({ context: { user } });
	},
);
