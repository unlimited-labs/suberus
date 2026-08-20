import type { McpScope } from "@/features/mcp/scopes";
import { lookup } from "@/shared/lib/lookup";

/** Plain-language descriptions for the OAuth scopes this server issues. */
const SCOPE_LABELS = {
	openid: "Confirm who you are",
	profile: "Read your name and account details",
	email: "Read your email address",
	offline_access: "Stay connected without asking you again",
	"users:read": "List and read participant records",
	"users:write": "Create participants and change their roles, fees and access",
	"conference:read": "Read conference settings, dates and deadlines",
	"conference:write": "Change conference settings, dates and deadlines",
	"submissions:read": "Read submissions, their authors and reviews",
	"submissions:write": "Create submissions on a participant's behalf",
	"activity:read": "Read the activity log",
	"schedule:read":
		"Read the programme: rooms, tracks, sessions, presentations and breaks",
	"schedule:write":
		"Build and publish the programme, including automatic planning",
	"email:send":
		"Compose and send emails to participants you select, and read past campaigns with their recipients",
} satisfies Record<string, string> satisfies Record<McpScope, string>;

export function scopeLabel(scope: string): string {
	return lookup(SCOPE_LABELS, scope) ?? scope;
}

export function connectCommand({
	url,
	clientId,
	callbackPort,
}: {
	url: string;
	clientId?: string;
	callbackPort?: number;
}): string {
	const base = `claude mcp add --scope project --transport http suberus ${url}`;
	if (!clientId || !callbackPort) return base;
	return `${base} --client-id ${clientId} --callback-port ${callbackPort}`;
}
