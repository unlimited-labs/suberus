import { createAuthClient } from "better-auth/react";

const baseURL = import.meta.env.VITE_APP_URL ?? "http://localhost:3001";

export const authClient = createAuthClient({ baseURL });

export const {
	signIn,
	signUp,
	signOut,
	useSession,
	resetPassword,
	sendVerificationEmail,
} = authClient;

// better-auth uses /request-password-reset endpoint
export async function forgetPassword(options: {
	email: string;
	redirectTo?: string;
}) {
	const response = await fetch(`${baseURL}/api/auth/request-password-reset`, {
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
