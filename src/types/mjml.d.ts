// Minimal ambient types for mjml v5. The published `@types/mjml` re-exports from
// the v4-only `mjml-core` package (absent in v5) and types the API as sync, but
// mjml v5's `mjml2html` is async. This declares only what we use.
declare module "mjml" {
	interface MjmlError {
		line: number;
		message: string;
		tagName: string;
		formattedMessage: string;
	}

	interface MjmlOptions {
		validationLevel?: "strict" | "soft" | "skip";
		keepComments?: boolean;
		minify?: boolean;
		fonts?: Record<string, string>;
	}

	interface MjmlResult {
		html: string;
		json: object;
		errors: MjmlError[];
	}

	export default function mjml2html(
		mjml: string,
		options?: MjmlOptions,
	): Promise<MjmlResult>;
}
