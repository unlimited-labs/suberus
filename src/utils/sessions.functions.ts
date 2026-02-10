import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware, authMiddleware } from "./auth.middleware";
import {
	createSession,
	deleteSession,
	getActiveSessions,
	getAllSessions,
	getReviewerUsers,
	updateSession,
} from "./sessions.server";

/**
 * Get all sessions with stats (admin only)
 */
export const getAllSessionsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return getAllSessions();
	});

/**
 * Create a new session (admin only)
 */
export const createSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			name: z.string().min(1).max(200),
			supervisorId: z.uuid().optional(),
		}),
	)
	.handler(async ({ data }) => {
		return createSession(data.name, data.supervisorId);
	});

/**
 * Update a session (admin only)
 */
export const updateSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			id: z.uuid(),
			name: z.string().min(1).max(200).optional(),
			supervisorId: z.uuid().nullable().optional(),
			isActive: z.boolean().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { id, ...updateData } = data;
		await updateSession(id, updateData);
	});

/**
 * Delete a session (admin only)
 */
export const deleteSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			id: z.uuid(),
		}),
	)
	.handler(async ({ data }) => {
		await deleteSession(data.id);
	});

/**
 * Get active sessions (authenticated users)
 */
export const getActiveSessionsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getActiveSessions();
	});

/**
 * Get reviewer users (admin only)
 */
export const getReviewerUsersFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return getReviewerUsers();
	});
