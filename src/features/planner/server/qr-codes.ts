import type { Readable } from "node:stream";
import { ZipArchive } from "archiver";
import QRCode from "qrcode";
import { env } from "@/env";
import type { ProgramQrSettings } from "@/features/settings/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/server/db.server";

function normalizeBase(baseUrl: string): string {
	return baseUrl.trim().replace(/\/+$/, "");
}

function appBase(): string {
	return env.APP_BASE_URL.replace(/\/+$/, "");
}

export function submissionQrUrl(
	baseUrl: string,
	sequentialNumber: number,
): string {
	const base = normalizeBase(baseUrl) || `${appBase()}/s`;
	return `${base}/${sequentialNumber}`;
}

export function programQrUrl(baseUrl: string): string {
	return normalizeBase(baseUrl) || `${appBase()}/program`;
}

export function defaultQrTargets() {
	return { program: programQrUrl(""), talk: submissionQrUrl("", 42) };
}

export interface RenderedQr {
	body: string | Uint8Array<ArrayBuffer>;
	contentType: string;
}

function qrToEps(url: string, settings: ProgramQrSettings): string {
	const { modules } = QRCode.create(url, {
		errorCorrectionLevel: settings.errorCorrectionLevel,
	});
	const side = settings.width;
	const cell = side / (modules.size + settings.margin * 2);
	const rects: string[] = [];
	for (let row = 0; row < modules.size; row++) {
		for (let col = 0; col < modules.size; col++) {
			if (!modules.get(row, col)) continue;
			const x = (col + settings.margin) * cell;
			const y = side - (row + 1 + settings.margin) * cell;
			rects.push(
				`${x.toFixed(3)} ${y.toFixed(3)} ${cell.toFixed(3)} dup rectfill`,
			);
		}
	}
	return [
		"%!PS-Adobe-3.0 EPSF-3.0",
		`%%BoundingBox: 0 0 ${Math.ceil(side)} ${Math.ceil(side)}`,
		"%%Creator: Suberus",
		"%%EndComments",
		`1 setgray 0 0 ${Math.ceil(side)} dup rectfill`,
		"0 setgray",
		...rects,
		"showpage",
		"%%EOF",
		"",
	].join("\n");
}

export async function renderQr(
	url: string,
	settings: ProgramQrSettings,
): Promise<RenderedQr> {
	const options = {
		errorCorrectionLevel: settings.errorCorrectionLevel,
		margin: settings.margin,
		width: settings.width,
	} as const;

	if (settings.format === "eps") {
		return {
			body: qrToEps(url, settings),
			contentType: "application/postscript",
		};
	}
	if (settings.format === "png") {
		const png = await QRCode.toBuffer(url, { ...options, type: "png" });
		return { body: new Uint8Array(png), contentType: "image/png" };
	}
	const svg = await QRCode.toString(url, { ...options, type: "svg" });
	return { body: svg, contentType: "image/svg+xml" };
}

export async function createProgramQrZipStream(
	settings: ProgramQrSettings,
): Promise<Readable> {
	const where: Prisma.SubmissionWhereInput = {
		presentationSlot: { isNot: null },
		type: { not: "INVITED" },
	};
	if (!settings.includeWithoutCameraReady) {
		where.cameraReadyFileId = { not: null };
	}

	const submissions = await prisma.submission.findMany({
		where,
		select: { sequentialNumber: true },
		orderBy: { sequentialNumber: "asc" },
	});

	const archive = new ZipArchive({ store: true });
	for (const { sequentialNumber } of submissions) {
		const qr = await renderQr(
			submissionQrUrl(settings.baseUrl, sequentialNumber),
			settings,
		);
		archive.append(Buffer.from(qr.body), {
			name: `${sequentialNumber}.${settings.format}`,
		});
	}
	archive.on("error", (cause) => archive.destroy(cause));
	void archive.finalize().catch(() => {});

	return archive;
}
