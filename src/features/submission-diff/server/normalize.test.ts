import AdmZip from "adm-zip";
import { describe, expect, it } from "vitest";
import { artifactKey, type BundleMeta, parseBundle, sha256 } from "./normalize";

function buildBundle(opts: {
	html: string;
	meta: BundleMeta;
	figures?: Record<string, Buffer>;
	extra?: Record<string, Buffer>;
}): Buffer {
	const z = new AdmZip();
	z.addFile("document.html", Buffer.from(opts.html, "utf8"));
	z.addFile("meta.json", Buffer.from(JSON.stringify(opts.meta), "utf8"));
	for (const [name, data] of Object.entries(opts.figures ?? {})) {
		z.addFile(`figures/${name}.png`, data);
	}
	for (const [name, data] of Object.entries(opts.extra ?? {})) {
		z.addFile(name, data);
	}
	return z.toBuffer();
}

const META: BundleMeta = {
	pandocVersion: "3.5",
	libreofficeVersion: "LibreOffice 7.4",
	normalizerConfigHash: "a".repeat(64),
	schemaVersion: 1,
	warnings: null,
};

describe("sha256", () => {
	it("is stable and content-addressed", () => {
		expect(sha256(Buffer.from("hello"))).toBe(sha256(Buffer.from("hello")));
		expect(sha256(Buffer.from("a"))).not.toBe(sha256(Buffer.from("b")));
		expect(sha256(Buffer.from("hello"))).toMatch(/^[0-9a-f]{64}$/);
	});
});

describe("parseBundle", () => {
	it("extracts html, meta and content-addressed figures", () => {
		const figSha = sha256(Buffer.from("png-bytes"));
		const zip = buildBundle({
			html: '<p>hi <img src="figures/x.png"></p>',
			meta: META,
			figures: { [figSha]: Buffer.from("png-bytes") },
		});
		const parsed = parseBundle(zip);
		expect(parsed.html).toContain("<p>hi");
		expect(parsed.meta.pandocVersion).toBe("3.5");
		expect(parsed.figures.get(figSha)?.toString()).toBe("png-bytes");
		expect(parsed.figures.size).toBe(1);
	});

	it("ignores non-figure entries", () => {
		const zip = buildBundle({
			html: "<p>x</p>",
			meta: META,
			extra: {
				"notes.txt": Buffer.from("x"),
				"figures/bad.png": Buffer.from("y"),
			},
		});
		// `figures/bad.png` has a non-sha name → not collected.
		expect(parseBundle(zip).figures.size).toBe(0);
	});

	it("throws when required entries are missing", () => {
		const z = new AdmZip();
		z.addFile("meta.json", Buffer.from("{}", "utf8"));
		expect(() => parseBundle(z.toBuffer())).toThrow(/missing/);
	});
});

describe("artifactKey", () => {
	it("is deterministic for the same source + toolchain", () => {
		const src = sha256(Buffer.from("docx"));
		expect(artifactKey(src, "DOCX", META)).toEqual(
			artifactKey(src, "DOCX", META),
		);
	});

	it("differs when any toolchain component changes", () => {
		const src = sha256(Buffer.from("docx"));
		const base = artifactKey(src, "DOCX", META);
		expect(
			artifactKey(src, "DOCX", { ...META, pandocVersion: "3.6" }),
		).not.toEqual(base);
		expect(artifactKey(src, "DOCX", { ...META, schemaVersion: 2 })).not.toEqual(
			base,
		);
		expect(
			artifactKey(src, "DOCX", {
				...META,
				normalizerConfigHash: "b".repeat(64),
			}),
		).not.toEqual(base);
	});

	it("throws when pandocVersion is missing", () => {
		const src = sha256(Buffer.from("docx"));
		expect(() =>
			artifactKey(src, "DOCX", { ...META, pandocVersion: null }),
		).toThrow(/pandocVersion/);
	});
});
