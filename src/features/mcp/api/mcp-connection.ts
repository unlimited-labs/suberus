import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/features/auth/server/middleware";
import {
	getMcpConnectionInfo,
	mintMcpDesktopClient as mintDesktopClient,
	revokeMcpClient as revokeClient,
} from "@/features/mcp/server/connection";
import {
	mcpDesktopClientInput,
	mcpRevokeClientInput,
} from "@/features/mcp/validations";

export const getMcpConnection = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async ({ context }) => getMcpConnectionInfo(context.user.id));

export const mintMcpDesktopClient = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(mcpDesktopClientInput)
	.handler(async ({ context, data }) =>
		mintDesktopClient(context.user.id, data.callbackPort),
	);

export const revokeMcpClient = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(mcpRevokeClientInput)
	.handler(async ({ context, data }) =>
		revokeClient(context.user.id, data.clientId),
	);

export const mcpConnectionQueryOptions = () =>
	queryOptions({
		queryKey: ["mcp", "connection"],
		queryFn: () => getMcpConnection(),
	});
