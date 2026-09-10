import { env } from "@/env";
import {
	type UploadedDocumentToken,
	uploadedDocumentTokenSchema,
} from "@/features/documents/validations";
import {
	createCapabilityToken,
	verifyCapabilityToken,
} from "@/shared/server/capability-token";

export const DOCUMENT_UPLOAD_LINK_TTL_MS = 60 * 60 * 1000;

export function issueDocumentUploadLink(meta: UploadedDocumentToken) {
	const subject = Buffer.from(JSON.stringify(meta)).toString("base64url");
	const { token, expiresAt } = createCapabilityToken(
		"dup",
		subject,
		env.AUTH_SECRET,
		DOCUMENT_UPLOAD_LINK_TTL_MS,
	);
	return {
		url: `${env.APP_BASE_URL.replace(/\/$/, "")}/api/documents/upload/${token}`,
		expiresAt,
	};
}

export function readDocumentUploadToken(token: string): UploadedDocumentToken {
	const parsed = verifyCapabilityToken(token, "dup", env.AUTH_SECRET);
	if (!parsed.ok) {
		throw parsed.error === "expired"
			? new Response("This upload link has expired", { status: 410 })
			: new Response("This upload link is not valid", { status: 403 });
	}

	const meta = uploadedDocumentTokenSchema.safeParse(
		JSON.parse(Buffer.from(parsed.subjectId, "base64url").toString("utf8")),
	);
	if (!meta.success) {
		throw new Response("This upload link is not valid", { status: 403 });
	}
	return meta.data;
}
