import type { EmailCampaignFormat } from "@/generated/prisma/enums";
import { renderMarkdown } from "@/shared/lib/markdown";

export interface RenderedEmail {
	/** Body with `{{placeholders}}` still intact (substituted per recipient). */
	body: string;
	/** When false the body is plain text (sent as `text`, not `html`). */
	isHtml: boolean;
}

/**
 * Compiles MJML to HTML. Server-only (mjml is heavy and async in v5). `mjml` is
 * imported dynamically so its large dependency graph (cosmiconfig/cheerio/juice)
 * stays out of the static server bundle — pulling it in statically perturbs the
 * SSR chunk order and breaks startup.
 */
export async function renderMjml(source: string): Promise<string> {
	const { default: mjml2html } = await import("mjml");
	const { html } = await mjml2html(source, { validationLevel: "soft" });
	return html;
}

/**
 * Renders a campaign body to its sendable form. Placeholders pass through
 * markdown/MJML as literal text and are substituted later, per recipient.
 */
export async function renderEmailContent(
	format: EmailCampaignFormat,
	source: string,
): Promise<RenderedEmail> {
	switch (format) {
		case "PLAIN":
			return { body: source, isHtml: false };
		case "MARKDOWN":
			return { body: renderMarkdown(source), isHtml: true };
		case "MJML":
			return { body: await renderMjml(source), isHtml: true };
		default: {
			const _exhaustive: never = format;
			throw new Error(`Unsupported email format: ${_exhaustive}`);
		}
	}
}
