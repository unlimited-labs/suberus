import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware, authMiddleware } from "./auth.middleware";
import {
	createProgramTrack,
	deleteProgramTrack,
	getAllProgramTracks,
	importFromConferenceTracks,
	updateProgramTrack,
} from "./program-tracks.server";

export const allProgramTracksQueryOptions = () =>
	queryOptions({
		queryKey: ["programTracks", "all"],
		queryFn: () => getAllProgramTracksFn(),
	});

export const getAllProgramTracksFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getAllProgramTracks();
	});

export const createProgramTrackFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			name: z.string().min(1).max(200),
			color: z
				.string()
				.regex(/^#[0-9a-fA-F]{6}$/, "Color must be #RRGGBB")
				.nullable()
				.optional(),
		}),
	)
	.handler(async ({ data }) => {
		return createProgramTrack(data);
	});

export const updateProgramTrackFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			id: z.uuid(),
			name: z.string().min(1).max(200).optional(),
			color: z
				.string()
				.regex(/^#[0-9a-fA-F]{6}$/, "Color must be #RRGGBB")
				.nullable()
				.optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { id, ...update } = data;
		await updateProgramTrack(id, update);
	});

export const deleteProgramTrackFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		await deleteProgramTrack(data.id);
	});

export const importProgramTracksFromIntakeFn = createServerFn({
	method: "POST",
})
	.middleware([adminMiddleware])
	.handler(async () => {
		return importFromConferenceTracks();
	});
