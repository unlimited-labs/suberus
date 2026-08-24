import { env } from "@/env";
import {
	createCapabilityToken,
	UPLOAD_LINK_TTL_MS,
	verifyCapabilityToken,
} from "@/features/submissions/server/capability-token";

export function issueUploadLink(submissionId: string) {
	const { token, expiresAt } = createCapabilityToken(
		"up",
		submissionId,
		env.AUTH_SECRET,
		UPLOAD_LINK_TTL_MS,
	);
	return {
		url: `${env.APP_BASE_URL.replace(/\/$/, "")}/api/submissions/upload/${token}`,
		expiresAt,
	};
}

export function readUploadToken(token: string) {
	return verifyCapabilityToken(token, "up", env.AUTH_SECRET);
}
