import type { RawEmail } from "@/shared/server/email";
import { applyPlaceholders, recipientValues } from "../lib/placeholders";
import type { MailAttachment } from "./attachments";

export interface MailRecipientInput {
	email: string;
	firstName: string | null;
	lastName: string | null;
	titles: string;
}

export interface CampaignContent {
	subject: string;
	/** Pre-rendered body snapshot, placeholders intact. */
	body: string;
	isHtml: boolean;
	replyTo?: string;
	attachments?: MailAttachment[];
}

export function buildRecipientMail(
	content: CampaignContent,
	recipient: MailRecipientInput,
): RawEmail {
	const values = recipientValues(recipient);
	const subject = applyPlaceholders(content.subject, values, false);
	const body = applyPlaceholders(content.body, values, content.isHtml);
	return {
		to: recipient.email,
		subject,
		...(content.isHtml ? { html: body } : { text: body }),
		replyTo: content.replyTo || undefined,
		attachments: content.attachments?.length ? content.attachments : undefined,
	};
}
