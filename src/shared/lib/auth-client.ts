import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({ plugins: [passkeyClient()] });

export const { signIn, signUp, signOut, resetPassword, sendVerificationEmail } =
	authClient;

// better-auth SDK's forgetPassword calls /forget-password but server exposes /request-password-reset
export async function forgetPassword(options: {
	email: string;
	redirectTo?: string;
}) {
	const response = await fetch("/api/auth/request-password-reset", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(options),
	});

	if (!response.ok) {
		const data = await response.json().catch(() => ({}));
		return { error: { message: data.message || "Failed to send reset email" } };
	}

	return { data: await response.json() };
}
