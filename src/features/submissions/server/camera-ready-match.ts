const IGNORED_BULK_NAMES = new Set(["submissions.csv"]);

export function isIgnoredBulkEntry(baseName: string): boolean {
	return (
		baseName.startsWith(".") || IGNORED_BULK_NAMES.has(baseName.toLowerCase())
	);
}

export function cameraReadyNumberFromFilename(baseName: string): number | null {
	const match = baseName.match(/^(\d+)/);
	return match ? Number(match[1]) : null;
}
