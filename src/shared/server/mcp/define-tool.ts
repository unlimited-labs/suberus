import { z } from "zod";
import { UserRole } from "@/generated/prisma/enums";

export const mcpActorSchema = z.object({
	id: z.string(),
	role: z.enum(UserRole),
	scopes: z.array(z.string()),
});

export type McpActor = z.infer<typeof mcpActorSchema>;

export interface McpTool<Input extends z.ZodType = z.ZodType> {
	name: string;
	title: string;
	description: string;
	input: Input;
	roles: readonly UserRole[];
	/**
	 * OAuth scope the access token must carry. Role and scope are independent:
	 * the role is what the person may do, the scope is how much of that they
	 * delegated to this application. Both have to allow the call.
	 */
	scope: string;
	readOnly?: boolean;
	destructive?: boolean;
	// Method shorthand, not an arrow property: bivariant parameter checking is
	// what lets a concretely-typed tool sit in an McpTool<z.ZodType> registry
	// without a cast.
	handler(input: z.infer<Input>, actor: McpActor): Promise<unknown>;
}

export function defineTool<Input extends z.ZodType>(
	tool: McpTool<Input>,
): McpTool<Input> {
	return tool;
}
