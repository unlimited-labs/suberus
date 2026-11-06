import { describe, expect, it } from "vitest";
import { printImageInfo } from "./print-image-rules";

const png = (w: number, h: number) => {
	const b = new Uint8Array(24);
	b.set([
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48,
		0x44, 0x52,
	]);
	new DataView(b.buffer).setUint32(16, w);
	new DataView(b.buffer).setUint32(20, h);
	return b;
};

const jpeg = (w: number, h: number) =>
	new Uint8Array([
		0xff,
		0xd8,
		0xff,
		0xe0,
		0x00,
		0x04,
		0x00,
		0x00,
		0xff,
		0xc0,
		0x00,
		0x11,
		0x08,
		h >> 8,
		h & 255,
		w >> 8,
		w & 255,
		3,
	]);

describe("printImageInfo", () => {
	it("reads the size of a PNG and a baseline JPEG logo", () => {
		expect(printImageInfo(png(400, 100))).toEqual({
			mime: "image/png",
			width: 400,
			height: 100,
		});
		expect(printImageInfo(jpeg(300, 150))).toEqual({
			mime: "image/jpeg",
			width: 300,
			height: 150,
		});
	});

	it("rejects formats a printed document cannot embed", () => {
		expect(
			printImageInfo(new TextEncoder().encode("RIFF....WEBPVP8 ")),
		).toBeNull();
	});
});
