import { convert } from "html-to-text";
import nodemailer from "nodemailer";
import { env } from "@/env.ts";
import type { EmailEventType } from "@/generated/prisma/enums";
import { logger } from "@/logger.ts";
import { prisma } from "@/shared/server/db.server";

/** Reads a string app-setting straight from the shared KV table, treating unset
 * and empty as null. Deliberately stateless: the bundler emits more than one
 * copy of this module, so any module-level provider registered at startup is
 * null in the other copy (which is what actually sends most mail). */
async function emailSetting(key: string): Promise<string | null> {
	const row = await prisma.appSetting.findUnique({ where: { key } });
	return typeof row?.value === "string" ? row.value || null : null;
}

/** `from` is a no-reply relay, so replies need steering to a real mailbox. */
function resolveReplyTo(): Promise<string | null> {
	return emailSetting("CONTACT_EMAIL");
}

async function resolveEmailFooter(): Promise<string | null> {
	const footer = await emailSetting("EMAIL_FOOTER_TEXT");
	if (!footer) return null;
	const conferenceName = await emailSetting("CONFERENCE_NAME");
	return footer.replace(/\{\{conferenceName\}\}/g, conferenceName ?? "");
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

const transporter = nodemailer.createTransport({
	host: env.SMTP_HOST,
	port: env.SMTP_PORT,
	secure: env.SMTP_SECURE,
	// Gate on auth presence so plaintext-only relays (dev/Mailpit) still work.
	requireTLS: !env.SMTP_SECURE && Boolean(env.SMTP_USER && env.SMTP_PASSWORD),
	pool: true,
	maxConnections: 5,
	connectionTimeout: 10_000,
	greetingTimeout: 10_000,
	socketTimeout: 15_000,
	...(env.SMTP_USER && env.SMTP_PASSWORD
		? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
		: {}),
});

function textAlternative(html: string): string {
	return convert(html, { wordwrap: false });
}

async function sendWithRetry(send: () => Promise<unknown>): Promise<void> {
	try {
		await send();
	} catch (err) {
		const msg = err instanceof Error ? err.message : "";
		const transient =
			msg.includes("Greeting never received") || msg.includes("ECONN");
		if (!transient) throw err;
		logger.warn(`[smtp] transient send error, retrying: ${msg}`);
		await new Promise((r) => setTimeout(r, 2_000));
		await send();
	}
}

/** In E2E mode, tag mail to `*-<runId>@e2e.local` so Mailpit can isolate per run. */
function e2eHeaders(to: string): Record<string, string> | undefined {
	if (!env.E2E) return undefined;
	const testRunIdMatch = to.match(/^[^-]+-([^@]+)@e2e\.local$/);
	return testRunIdMatch?.[1]
		? { "X-Test-Run-Id": testRunIdMatch[1] }
		: undefined;
}

export interface RawEmail {
	to: string;
	subject: string;
	html?: string;
	text?: string;
	cc?: string[];
	bcc?: string[];
	replyTo?: string;
	attachments?: { filename: string; content: Buffer }[];
}

/**
 * Low-level send over the pooled transport. Unlike {@link sendEmail}, this
 * THROWS on failure so callers (e.g. the bulk-email worker) can record
 * per-recipient status. The caller owns subject/body rendering.
 */
export async function sendRawEmail(mail: RawEmail): Promise<void> {
	const headers = e2eHeaders(mail.to);
	const text =
		mail.text ?? (mail.html ? textAlternative(mail.html) : undefined);
	const replyTo = mail.replyTo || (await resolveReplyTo());
	await transporter.sendMail({
		from: env.SMTP_FROM_EMAIL,
		to: mail.to,
		cc: mail.cc?.length ? mail.cc : undefined,
		bcc: mail.bcc?.length ? mail.bcc : undefined,
		...(replyTo ? { replyTo } : {}),
		subject: mail.subject,
		...(mail.html !== undefined ? { html: mail.html } : {}),
		...(text !== undefined ? { text } : {}),
		...(mail.attachments?.length ? { attachments: mail.attachments } : {}),
		headers,
	});
}

export async function sendEmail(
	eventType: EmailEventType,
	to: string,
	variables: Record<string, string>,
): Promise<void> {
	try {
		const template = await prisma.emailTemplate.findUnique({
			where: { eventType },
		});

		if (!template?.isEnabled) return;

		let subject = template.subject;
		let body = template.body;

		for (const [key, value] of Object.entries(variables)) {
			const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
			// Function replacers avoid `$`-pattern interpretation in the value.
			// HTML bodies escape the (often user-controlled) value to prevent
			// markup/link injection; the subject is a plain-text header.
			const bodyValue = template.isHtml ? escapeHtml(value) : value;
			subject = subject.replace(regex, () => value);
			body = body.replace(regex, () => bodyValue);
		}

		// Append global email footer if configured
		const footer = await resolveEmailFooter();
		if (footer) {
			if (template.isHtml) {
				body += `<hr><p>${escapeHtml(footer)}</p>`;
			} else {
				body += `\n\n---\n${footer}`;
			}
		}

		const replyTo = await resolveReplyTo();

		await sendWithRetry(() =>
			transporter.sendMail({
				from: env.SMTP_FROM_EMAIL,
				to,
				cc: template.ccEmails.length > 0 ? template.ccEmails : undefined,
				bcc: template.bccEmails.length > 0 ? template.bccEmails : undefined,
				...(replyTo ? { replyTo } : {}),
				subject,
				...(template.isHtml
					? { html: body, text: textAlternative(body) }
					: { text: body }),
				headers: e2eHeaders(to),
			}),
		);
		logger.info(`[email] sent ${eventType} to ${to}`);
	} catch (error) {
		// Log error but don't throw - email sending should not break the main flow
		logger.error(`Failed to send email (${eventType}):`, error);
	}
}

export interface SmtpHealthResult {
	status: "healthy" | "error";
	host: string;
	port: number;
	message: string;
}

export async function checkSmtpHealth(): Promise<SmtpHealthResult> {
	const host = env.SMTP_HOST ?? "localhost";
	const port = env.SMTP_PORT;

	try {
		await Promise.race([
			transporter.verify(),
			new Promise((_, reject) =>
				setTimeout(
					() => reject(new Error("SMTP health check timed out")),
					5000,
				),
			),
		]);
		return {
			status: "healthy",
			host,
			port,
			message: "SMTP server is reachable",
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown SMTP error";
		logger.warn(`[smtp] health check failed: ${message}`);
		return {
			status: "error",
			host,
			port,
			message,
		};
	}
}

export async function sendTestEmail(
	to: string,
	subject: string,
	body: string,
	isHtml: boolean,
	placeholders: Record<string, string>,
): Promise<void> {
	let resolvedSubject = `[TEST] ${subject}`;
	let resolvedBody = body;

	for (const [key, value] of Object.entries(placeholders)) {
		const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
		const bodyValue = isHtml ? escapeHtml(value) : value;
		resolvedSubject = resolvedSubject.replace(regex, () => value);
		resolvedBody = resolvedBody.replace(regex, () => bodyValue);
	}

	const footer = await resolveEmailFooter();
	if (footer) {
		if (isHtml) {
			resolvedBody += `<hr><p>${escapeHtml(footer)}</p>`;
		} else {
			resolvedBody += `\n\n---\n${footer}`;
		}
	}

	const replyTo = await resolveReplyTo();

	const mailOptions = {
		from: env.SMTP_FROM_EMAIL,
		to,
		...(replyTo ? { replyTo } : {}),
		subject: resolvedSubject,
		...(isHtml
			? { html: resolvedBody, text: textAlternative(resolvedBody) }
			: { text: resolvedBody }),
	};

	// Use a direct transport with retry for one-off test emails
	// to avoid contention with the pooled connection
	const send = async () => {
		const direct = nodemailer.createTransport({
			host: env.SMTP_HOST,
			port: env.SMTP_PORT,
			secure: env.SMTP_SECURE,
			connectionTimeout: 10_000,
			greetingTimeout: 10_000,
			socketTimeout: 15_000,
			...(env.SMTP_USER && env.SMTP_PASSWORD
				? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
				: {}),
		});
		try {
			await direct.sendMail(mailOptions);
		} finally {
			direct.close();
		}
	};

	try {
		await sendWithRetry(send);
		logger.info(`[email] test sent to ${to}`);
	} catch (err) {
		logger.error("[email] test email failed:", err);
		throw err;
	}
}
