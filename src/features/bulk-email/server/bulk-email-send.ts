import type { RawEmail } from "@/shared/server/email";
import { applyPlaceholders, recipientValues } from "../lib/placeholders";

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
	/** When false the body is sent as plain text. */
	isHtml: boolean;
	/** Shared across all recipients; loaded once by the worker. */
	attachments?: { filename: string; content: Buffer }[];
}

/**
 * Builds the concrete {@link RawEmail} for one recipient: substitutes the
 * snapshot placeholders into the (plain-text) subject and the rendered body,
 * routing to `html` or `text`. Pure — the worker handles the actual send.
 */
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
		...(content.attachments?.length
			? { attachments: content.attachments }
			: {}),
	};
}
