interface PrintImageInfo {
	mime: "image/png" | "image/jpeg";
	width: number;
	height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SOF = new Set([
	0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function jpegSize(view: DataView): PrintImageInfo | null {
	let at = 2;
	while (at + 9 < view.byteLength) {
		if (view.getUint8(at) !== 0xff) return null;
		const marker = view.getUint8(at + 1);
		if (JPEG_SOF.has(marker))
			return {
				mime: "image/jpeg",
				height: view.getUint16(at + 5),
				width: view.getUint16(at + 7),
			};
		at += 2 + view.getUint16(at + 2);
	}
	return null;
}

export function printImageInfo(bytes: Uint8Array): PrintImageInfo | null {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	if (bytes.length >= 24 && PNG_SIGNATURE.every((b, i) => bytes[i] === b))
		return {
			mime: "image/png",
			width: view.getUint32(16),
			height: view.getUint32(20),
		};
	if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8)
		return jpegSize(view);
	return null;
}
