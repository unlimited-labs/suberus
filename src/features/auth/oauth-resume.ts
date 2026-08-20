const AUTHORIZE_PATH = "/api/auth/oauth2/authorize";

// The provider parks an unauthenticated /oauth2/authorize on the login page with
// its signed query; returns that query to re-enter authorize, null if absent.
export function oauthResumeSearch(
	search = "window" in globalThis ? window.location.search : "",
): string | null {
	const params = new URLSearchParams(search);
	if (!params.has("sig") || !params.has("client_id")) return null;
	// The sign-in just satisfied prompt=login; keeping it bounces back to /login.
	const prompts = (params.get("prompt") ?? "")
		.split(" ")
		.filter((prompt) => prompt && prompt !== "login");
	if (prompts.length) params.set("prompt", prompts.join(" "));
	else params.delete("prompt");
	return params.toString();
}

export function resumeOAuthAuthorize(search: string): void {
	window.location.href = `${AUTHORIZE_PATH}?${search}`;
}
