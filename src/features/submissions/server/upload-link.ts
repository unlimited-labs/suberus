import { env } from "@/env";
import {
	createUploadToken,
	UPLOAD_LINK_TTL_MS,
	verifyUploadToken,
} from "@/features/submissions/server/upload-token";

export function issueUploadLink(
	submissionId: string,
	ttlMs: number = UPLOAD_LINK_TTL_MS,
): { url: string; expiresAt: Date } {
	const { token, expiresAt } = createUploadToken(
		submissionId,
		env.AUTH_SECRET,
		ttlMs,
	);
	return {
		url: `${env.APP_BASE_URL.replace(/\/$/, "")}/api/submissions/upload/${token}`,
		expiresAt,
	};
}

export function readUploadToken(token: string) {
	return verifyUploadToken(token, env.AUTH_SECRET);
}
