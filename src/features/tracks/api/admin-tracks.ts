import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware } from "@/features/auth/server/middleware";
import {
	createTrack,
	deleteTrack,
	getAllTracks,
	updateTrack,
} from "@/features/tracks/server/admin-tracks";

export const allTracksQueryOptions = () =>
	queryOptions({
		queryKey: ["tracks", "all"],
		queryFn: () => getAllTracksFn(),
	});

/**
 * Get all tracks with stats (admin only)
 */
export const getAllTracksFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return getAllTracks();
	});

/**
 * Create a new track (admin only)
 */
export const createTrackFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			name: z.string().min(1).max(200),
			supervisorId: z.uuid().optional(),
		}),
	)
	.handler(async ({ data }) => {
		return createTrack(data.name, data.supervisorId);
	});

/**
 * Update a track (admin only)
 */
export const updateTrackFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			id: z.uuid(),
			name: z.string().min(1).max(200).optional(),
			supervisorId: z.uuid().nullable().optional(),
			isActive: z.boolean().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { id, ...updateData } = data;
		await updateTrack(id, updateData);
	});

/**
 * Delete a track (admin only)
 */
export const deleteTrackFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			id: z.uuid(),
		}),
	)
	.handler(async ({ data }) => {
		await deleteTrack(data.id);
	});
