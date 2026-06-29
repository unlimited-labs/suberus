export function isStaleSessionError(
	err: { code?: string; status?: number } | null | undefined,
) {
	return err?.code === "SESSION_NOT_FRESH" || err?.status === 403;
}
