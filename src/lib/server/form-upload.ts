/**
 * Helpers for `FormData`-based file upload server functions. TanStack Start
 * accepts `FormData` for POST server functions, so uploads travel as native
 * multipart `File`s instead of base64-in-JSON.
 */

/** Pull a required `File` field out of a multipart server-fn payload. */
export function getUploadedFile(data: FormData, field = "file"): File {
	const file = data.get(field);
	if (!(file instanceof File)) {
		throw new Error("No file was uploaded.");
	}
	return file;
}

/** Read a browser `File` into a Node `Buffer`. */
export async function fileToBuffer(file: File): Promise<Buffer> {
	return Buffer.from(await file.arrayBuffer());
}
