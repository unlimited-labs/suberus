import { env } from "@/env";
import { sidecarBase, sidecarHealth, sidecarNormalize } from "./http";

const base = () => sidecarBase(env.DOCLING_URL, "DOCLING_URL");

export interface DoclingApiHealth {
	/** The pandoc that converts docling markdown -> HTML (the artifact-key column). */
	pandocVersion: string | null;
	doclingVersion: string | null;
	normalizerConfigHash: string;
	schemaVersion: number;
}

/** Toolchain versions for the artifact cache key (cheap, no conversion). */
export function doclingApiHealth(): Promise<DoclingApiHealth> {
	return sidecarHealth<DoclingApiHealth>(base(), "docling-api");
}

/** POST a PDF to docling-api and return the zip bundle bytes (document.html + figures). */
export function normalizePdf(bytes: Buffer, fileName: string): Promise<Buffer> {
	return sidecarNormalize(
		base(),
		"/v1/bundle",
		"docling-api bundle",
		bytes,
		fileName,
	);
}
