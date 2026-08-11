import type { z } from "zod";
import type { UserRole } from "@/generated/prisma/enums";

export interface McpActor {
	id: string;
	role: UserRole;
}

export interface McpTool<Input extends z.ZodType = z.ZodType> {
	name: string;
	title: string;
	description: string;
	input: Input;
	roles: readonly UserRole[];
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
