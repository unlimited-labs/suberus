import { env } from "@/env";
import { sidecarBase, sidecarHealth, sidecarNormalize } from "./http";

const base = () => sidecarBase(env.PDF_API_URL, "PDF_API_URL");

export interface PdfApiHealth {
	/** The pandoc that converts docling markdown -> HTML (the artifact-key column). */
	pandocVersion: string | null;
	doclingVersion: string | null;
	normalizerConfigHash: string;
	schemaVersion: number;
}

/** Toolchain versions for the artifact cache key (cheap, no conversion). */
export function pdfApiHealth(): Promise<PdfApiHealth> {
	return sidecarHealth<PdfApiHealth>(base(), "pdf-api");
}

/** POST a PDF to pdf-api and return the zip bundle bytes (document.html + figures). */
export function normalizePdf(bytes: Buffer, fileName: string): Promise<Buffer> {
	return sidecarNormalize(
		base(),
		"/v1/bundle",
		"pdf-api bundle",
		bytes,
		fileName,
	);
}
