import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
	adminMiddleware,
	authMiddleware,
} from "@/features/auth/server/middleware";
import {
	createProgramTrack,
	deleteProgramTrack,
	getAllProgramTracks,
	importFromConferenceTracks,
	updateProgramTrack,
} from "@/features/planner/server/tracks";
import {
	idInput,
	trackCreateInput,
	trackUpdateInput,
} from "@/features/planner/validations";

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
	.validator(trackCreateInput)
	.handler(async ({ data }) => {
		return createProgramTrack(data);
	});

export const updateProgramTrackFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(trackUpdateInput)
	.handler(async ({ data }) => {
		const { id, ...update } = data;
		await updateProgramTrack(id, update);
	});

export const deleteProgramTrackFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(idInput)
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
