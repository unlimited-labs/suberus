import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	createRoom,
	deleteRoom,
	getAllRooms,
	updateRoom,
} from "@/features/planner/server/rooms";
import {
	adminMiddleware,
	authMiddleware,
} from "@/shared/server/middleware/auth";

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

const roomLinkSchema = z
	.union([z.literal(""), z.url()])
	.optional()
	.nullable();

export const createRoomFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			name: z.string().min(1).max(200),
			description: z.string().max(1000).nullable().optional(),
			link: roomLinkSchema,
			order: z.number().int().nonnegative().optional(),
		}),
	)
	.handler(async ({ data }) => {
		return createRoom({
			...data,
			link: data.link === "" ? null : data.link,
		});
	});

export const updateRoomFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			id: z.uuid(),
			name: z.string().min(1).max(200).optional(),
			description: z.string().max(1000).nullable().optional(),
			link: roomLinkSchema,
			order: z.number().int().nonnegative().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { id, link, ...rest } = data;
		await updateRoom(id, {
			...rest,
			...(link !== undefined ? { link: link === "" ? null : link } : {}),
		});
	});

export const deleteRoomFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		await deleteRoom(data.id);
	});
