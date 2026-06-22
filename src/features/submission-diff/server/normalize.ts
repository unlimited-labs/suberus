import { createHash } from "node:crypto";
import AdmZip from "adm-zip";
import type { ArtifactKind } from "@/generated/prisma/enums";

/** Hex sha256 of bytes — content-addressing for source files and figures. */
export function sha256(buf: Buffer): string {
	return createHash("sha256").update(buf).digest("hex");
}

/** meta.json shape emitted by the docx-api `/normalize` bundle. */
export interface BundleMeta {
	pandocVersion: string | null;
	libreofficeVersion: string | null;
	normalizerConfigHash: string;
	schemaVersion: number;
	warnings: string | null;
}

export interface ParsedBundle {
	html: string;
	/** Per-style CSS derived from the DOCX's styles.xml ("" when absent/no styles). */
	css: string;
	/** sha256 (hex) -> PNG bytes, keyed by the bundle's `figures/<sha>.png` names. */
	figures: Map<string, Buffer>;
	meta: BundleMeta;
}

const FIGURE_RE = /^figures\/([0-9a-f]{64})\.png$/;

/** Parse a docx-api zip bundle into HTML + content-addressed figures + meta. */
export function parseBundle(zip: Buffer): ParsedBundle {
	const z = new AdmZip(zip);
	const htmlEntry = z.getEntry("document.html");
	const metaEntry = z.getEntry("meta.json");
	if (!htmlEntry || !metaEntry) {
		throw new Error("docx-api bundle missing document.html or meta.json");
	}
	const html = htmlEntry.getData().toString("utf8");
	const meta = JSON.parse(metaEntry.getData().toString("utf8")) as BundleMeta;
	// styles.css is optional (pre-v4 bundles / no custom styles): default to "".
	const css = z.getEntry("styles.css")?.getData().toString("utf8") ?? "";

	const figures = new Map<string, Buffer>();
	for (const entry of z.getEntries()) {
		const match = FIGURE_RE.exec(entry.entryName);
		if (match) figures.set(match[1], entry.getData());
	}
	return { html, css, figures, meta };
}

/**
 * Full toolchain fingerprint = the `SubmissionVersionArtifact` unique key. A
 * change in ANY component (source bytes, kind, pandoc, normalizer config, schema)
 * yields a different artifact, so a toolchain bump never silently mutates a
 * historical diff (gotcha C4) — it re-extracts under the new key.
 */
export interface ArtifactKey {
	sourceSha256: string;
	kind: ArtifactKind;
	pandocVersion: string;
	normalizerConfigHash: string;
	schemaVersion: number;
}

export function artifactKey(
	sourceSha256: string,
	kind: ArtifactKind,
	meta: BundleMeta,
): ArtifactKey {
	if (!meta.pandocVersion) {
		throw new Error("docx-api bundle meta is missing pandocVersion");
	}
	return {
		sourceSha256,
		kind,
		pandocVersion: meta.pandocVersion,
		normalizerConfigHash: meta.normalizerConfigHash,
		schemaVersion: meta.schemaVersion,
	};
}
