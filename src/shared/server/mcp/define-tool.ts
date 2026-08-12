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
	/** Scope the token must carry; the actor's role has to allow it too. */
	scope: string;
	readOnly?: boolean;
	destructive?: boolean;
	// Method shorthand, not an arrow: bivariance is what lets a concrete tool
	// sit in an McpTool<z.ZodType> registry without a cast.
	handler(input: z.infer<Input>, actor: McpActor): Promise<unknown>;
}

export function defineTool<Input extends z.ZodType>(
	tool: McpTool<Input>,
): McpTool<Input> {
	return tool;
}
