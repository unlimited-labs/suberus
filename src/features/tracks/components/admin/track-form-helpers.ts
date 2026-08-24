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
