import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildPrintDocument } from "./print-document-rules";
import { printDocumentSchema } from "./print-document-schema";
import { printOptionsSchema } from "./print-options-schema";
import {
	buildPrintProgram,
	type PrintSource,
	type SourceSlot,
} from "./print-program-rules";

const FIXTURE =
	"../../../../services/docx-api/test_fixtures/print-document.json";

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});

function crc32(bytes: Buffer): number {
	let c = 0xffffffff;
	for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 255] ?? 0) ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
	const body = Buffer.concat([Buffer.from(type), data]);
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body));
	return Buffer.concat([len, body, crc]);
}

function greyPng(width: number, height: number): Buffer {
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header.set([8, 2, 0, 0, 0], 8);
	const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x33)]);
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		pngChunk("IHDR", header),
		pngChunk(
			"IDAT",
			deflateSync(Buffer.concat(Array.from({ length: height }, () => row))),
		),
		pngChunk("IEND", Buffer.alloc(0)),
	]);
}

const at = (iso: string) => new Date(iso);
const author = (id: string, firstName: string, lastName: string, i = 0) => ({
	id,
	userId: null,
	email: `${id}@x.org`,
	firstName,
	lastName,
	orderIndex: i,
	isPresenter: i === 0,
});
const slot = (
	id: string,
	order: number,
	extra: Partial<SourceSlot> = {},
): SourceSlot => ({
	id,
	order,
	durationMin: 20,
	cancelled: false,
	badgeId: null,
	submission: {
		id: `sub-${id}`,
		sequentialNumber: 10 + order,
		title: `Chain growth in composites ${id}`,
		type: "ABSTRACT",
		presenterId: null,
		authors: [
			author(`${id}a`, "Ewa", "Zając"),
			author(`${id}b`, "Łukasz", "Żak", 1),
		],
	},
	...extra,
});

const source: PrintSource = {
	conferenceName: "Polymers 2026",
	startDate: "2026-09-14",
	endDate: "2026-09-15",
	timeZone: "Europe/Warsaw",
	timeFormat: "24h",
	draft: true,
	rooms: [
		{ id: "a", name: "Aula", order: 0 },
		{ id: "b", name: "Sala 2", order: 1 },
	],
	badges: [{ id: "bp", label: "Best paper" }],
	sessions: [
		{
			id: "s1",
			title: "Opening",
			startAt: at("2026-09-14T07:00:00Z"),
			endAt: at("2026-09-14T08:00:00Z"),
			untimedSlots: false,
			roomId: "a",
			track: { name: "Polymers", color: "#d9480f" },
			chairs: [
				{ userId: "u1", email: "c@x.org", firstName: "Adam", lastName: "Lis" },
			],
			slots: [
				slot("p1", 0, { badgeId: "bp" }),
				slot("p2", 1, { cancelled: true }),
			],
		},
		{
			id: "s2",
			title: "Overlap",
			startAt: at("2026-09-14T07:30:00Z"),
			endAt: at("2026-09-14T08:30:00Z"),
			untimedSlots: false,
			roomId: "a",
			track: { name: "Metals", color: "#1971c2" },
			chairs: [],
			slots: [slot("p3", 0)],
		},
		{
			id: "s3",
			title: "Parallel",
			startAt: at("2026-09-14T07:00:00Z"),
			endAt: at("2026-09-14T08:30:00Z"),
			untimedSlots: false,
			roomId: "b",
			track: null,
			chairs: [],
			slots: [
				slot("p4", 0, {
					submission: { ...slot("p4", 0).submission, type: "INVITED" },
				}),
			],
		},
		{
			id: "s4",
			title: "Posters",
			startAt: at("2026-09-15T10:00:00Z"),
			endAt: at("2026-09-15T12:00:00Z"),
			untimedSlots: true,
			roomId: null,
			track: null,
			chairs: [],
			slots: [slot("p5", 0), slot("p6", 1)],
		},
	],
	items: [
		{
			id: "c1",
			kind: "BREAK",
			title: "Coffee",
			description: null,
			location: "Foyer",
			roomId: null,
			startAt: at("2026-09-14T08:30:00Z"),
			endAt: at("2026-09-14T09:00:00Z"),
		},
		{
			id: "e1",
			kind: "EVENT",
			title: "Dinner",
			description: "Old town",
			location: null,
			roomId: "b",
			startAt: at("2026-09-14T17:00:00Z"),
			endAt: at("2026-09-14T20:00:00Z"),
		},
	],
};

describe("shared PrintDocument fixture", () => {
	it("is what the builder emits today, so pytest checks the sidecar against the real contract (vitest -u regenerates it)", async () => {
		const options = printOptionsSchema.parse({
			language: "pl",
			includeCancelled: true,
		});
		const doc = buildPrintDocument(
			buildPrintProgram(source, options),
			options,
			{
				mime: "image/png",
				dataBase64: greyPng(8, 2).toString("base64"),
				aspectRatio: 4,
			},
		);
		expect(printDocumentSchema.safeParse(doc).success).toBe(true);
		await expect(`${JSON.stringify(doc, null, "\t")}\n`).toMatchFileSnapshot(
			FIXTURE,
		);
	});
});
