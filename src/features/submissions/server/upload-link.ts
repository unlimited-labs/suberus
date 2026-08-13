import { env } from "@/env";
import {
	createUploadToken,
	verifyUploadToken,
} from "@/features/submissions/server/upload-token";

export function issueUploadLink(submissionId: string): {
	url: string;
	expiresAt: Date;
} {
	const { token, expiresAt } = createUploadToken(submissionId, env.AUTH_SECRET);
	return {
		url: `${env.APP_BASE_URL.replace(/\/$/, "")}/api/submissions/upload/${token}`,
		expiresAt,
	};
}

export function readUploadToken(token: string) {
	return verifyUploadToken(token, env.AUTH_SECRET);
}
