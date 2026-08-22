export interface TrackFormState {
	name: string;
	supervisorId: string | undefined;
	isActive: boolean;
}

export function initialTrackForm(track?: {
	name: string;
	supervisorId: string | null;
	isActive: boolean;
}): TrackFormState {
	return {
		name: track?.name || "",
		supervisorId: track?.supervisorId || undefined,
		isActive: track?.isActive ?? true,
	};
}

export function validateTrackName(name: string): string | null {
	if (!name.trim()) return "Track name is required";
	if (name.length > 200) return "Track name must be at most 200 characters";
	return null;
}

export function normalizeSupervisorId(
	supervisorId: string | undefined,
): string | null {
	return supervisorId === "none" ? null : (supervisorId ?? null);
}

export function trackDialogLabels(isEdit: boolean) {
	return {
		title: isEdit ? "Edit Track" : "Create Track",
		description: isEdit
			? "Update track details"
			: "Create a new conference track",
		submitLabel: isEdit ? "Save" : "Create",
	};
}
