/** Plain-language descriptions for the OAuth scopes this server issues. */
const SCOPE_LABELS: Record<string, string> = {
	openid: "Confirm who you are",
	profile: "Read your name and account details",
	email: "Read your email address",
	offline_access: "Stay connected without asking you again",
};

export function scopeLabel(scope: string): string {
	return SCOPE_LABELS[scope] ?? scope;
}
