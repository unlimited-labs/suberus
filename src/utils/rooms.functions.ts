import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware, authMiddleware } from "./auth.middleware";
import {
	createRoom,
	deleteRoom,
	getAllRooms,
	updateRoom,
} from "./rooms.server";

export const allRoomsQueryOptions = () =>
	queryOptions({
		queryKey: ["rooms", "all"],
		queryFn: () => getAllRoomsFn(),
	});

export const getAllRoomsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getAllRooms();
	});

export const createRoomFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			name: z.string().min(1).max(200),
			capacity: z.number().int().positive().nullable().optional(),
			order: z.number().int().nonnegative().optional(),
		}),
	)
	.handler(async ({ data }) => {
		return createRoom(data);
	});

export const updateRoomFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			id: z.uuid(),
			name: z.string().min(1).max(200).optional(),
			capacity: z.number().int().positive().nullable().optional(),
			order: z.number().int().nonnegative().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { id, ...update } = data;
		await updateRoom(id, update);
	});

export const deleteRoomFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		await deleteRoom(data.id);
	});
