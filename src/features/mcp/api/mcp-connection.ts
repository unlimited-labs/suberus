import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/features/auth/server/middleware";
import { getMcpConnectionInfo } from "@/features/mcp/server/connection";

export const getMcpConnection = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async ({ context }) => getMcpConnectionInfo(context.user.id));

export const mcpConnectionQueryOptions = () =>
	queryOptions({
		queryKey: ["mcp", "connection"],
		queryFn: () => getMcpConnection(),
	});
