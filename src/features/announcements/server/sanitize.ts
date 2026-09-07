import { convert } from "html-to-text";
import type { EmailCampaignFormat } from "@/generated/prisma/enums";
import { renderMarkdown } from "@/shared/lib/markdown";
import { escapeHtml } from "@/shared/lib/placeholders";
import { sanitizeHtml } from "@/shared/server/sanitize-html";

/**
 * The body is admin-authored markdown but renders inside every recipient's
 * session, so raw HTML in it would be an admin-to-user escalation. Links stay
 * (an announcement usually points somewhere); images do not — an external
 * `<img>` would phone home from the reader's browser on open.
 */
const CONFIG = {
	ALLOWED_TAGS: [
		"p",
		"br",
		"hr",
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6",
		"ul",
		"ol",
		"li",
		"strong",
		"em",
		"b",
		"i",
		"u",
		"s",
		"sup",
		"sub",
		"code",
		"pre",
		"blockquote",
		"table",
		"thead",
		"tbody",
		"tr",
		"td",
		"th",
		"span",
		"div",
		"a",
	],
	ALLOWED_ATTR: [
		"class",
		"href",
		"dir",
		"title",
		"colspan",
		"rowspan",
		"type",
		"start",
	],
	ALLOWED_URI_REGEXP: /^(?:[#/]|[^:]*$|https?:\/\/|mailto:)/i,
	FORBID_TAGS: [
		"script",
		"style",
		"iframe",
		"object",
		"embed",
		"form",
		"input",
		"svg",
		"img",
	],
	FORBID_ATTR: ["srcset", "src"],
};

export function sanitizeAnnouncementHtml(html: string): string {
	return sanitizeHtml(html, CONFIG);
}

export function markdownToAnnouncementHtml(bodySource: string): string {
	return sanitizeAnnouncementHtml(renderMarkdown(bodySource));
}

export function plainTextToAnnouncementHtml(text: string): string {
	return `<p class="whitespace-pre-wrap">${escapeHtml(text)}</p>`;
}

/**
 * An MJML campaign is a table-layout email; it cannot render inside the app, so
 * the in-app copy degrades to the plain text a mail client would fall back to.
 */
export function campaignAnnouncementBody(
	format: EmailCampaignFormat,
	bodySource: string,
	renderedHtml: string,
): string {
	switch (format) {
		case "MARKDOWN":
			return sanitizeAnnouncementHtml(renderedHtml);
		case "PLAIN":
			return plainTextToAnnouncementHtml(bodySource);
		case "MJML":
			return plainTextToAnnouncementHtml(
				convert(renderedHtml, { wordwrap: false }),
			);
		default: {
			const _exhaustive: never = format;
			throw new Error(`Unsupported campaign format: ${_exhaustive}`);
		}
	}
}
