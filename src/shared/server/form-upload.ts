export function getUploadedFile(data: FormData, field = "file"): File {
	const file = data.get(field);
	if (!(file instanceof File)) {
		throw new Error("No file was uploaded.");
	}
	return file;
}

export async function fileToBuffer(file: File): Promise<Buffer> {
	return Buffer.from(await file.arrayBuffer());
}
