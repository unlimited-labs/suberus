import type { z } from "zod";
import type { UserRole } from "@/generated/prisma/enums";

export const ADMIN_AND_EDITOR = ["ADMIN", "EDITOR"] as const;

export interface McpActor {
	id: string;
	role: UserRole;
	email: string;
	scopes: string[];
}

/** Whatever a tool answers with; `runTool` serializes it to JSON for the agent. */
export type McpToolResult = object | string | number | boolean | null;

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
	handler(input: z.infer<Input>, actor: McpActor): Promise<McpToolResult>;
}

export function defineTool<Input extends z.ZodType>(
	tool: McpTool<Input>,
): McpTool<Input> {
	return tool;
}
