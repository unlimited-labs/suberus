import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
	adminMiddleware,
	authMiddleware,
} from "@/features/auth/server/middleware";
import {
	createRoom,
	deleteRoom,
	getAllRooms,
	updateRoom,
} from "@/features/planner/server/rooms";
import {
	idInput,
	roomCreateInput,
	roomUpdateInput,
} from "@/features/planner/validations";

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
	.validator(roomCreateInput)
	.handler(async ({ data }) => {
		return createRoom(data);
	});

export const updateRoomFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(roomUpdateInput)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		await updateRoom(id, rest);
	});

export const deleteRoomFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(idInput)
	.handler(async ({ data }) => {
		await deleteRoom(data.id);
	});
