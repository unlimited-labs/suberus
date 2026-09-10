const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function baseNameOf(entryName: string): string {
	return entryName.split("/").pop() ?? entryName;
}

export function isIgnoredZipEntry(baseName: string): boolean {
	return baseName.startsWith(".") || baseName.startsWith("__MACOSX");
}

export function documentUserIdFromEntry(entryName: string): string | null {
	const base = baseNameOf(entryName);
	if (!base.toLowerCase().endsWith(".pdf")) return null;
	const id = base.slice(0, -4);
	return UUID.test(id) ? id.toLowerCase() : null;
}
