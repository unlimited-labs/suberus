/** Plain-language descriptions for the OAuth scopes this server issues. */
const SCOPE_LABELS: Record<string, string> = {
	openid: "Confirm who you are",
	profile: "Read your name and account details",
	email: "Read your email address",
	offline_access: "Stay connected without asking you again",
	"users:read": "List and read participant records",
	"users:write": "Create participants and change their roles, fees and access",
	"conference:read": "Read conference settings, dates and deadlines",
	"conference:write": "Change conference settings, dates and deadlines",
	"submissions:read": "Read submissions, their authors and reviews",
	"activity:read": "Read the activity log",
};

export function scopeLabel(scope: string): string {
	return SCOPE_LABELS[scope] ?? scope;
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
	if (!clientId || callbackPort == null) return base;
	return `${base} --client-id ${clientId} --callback-port ${callbackPort}`;
}
