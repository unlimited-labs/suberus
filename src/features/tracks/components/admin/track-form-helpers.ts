export interface TrackFormState {
	name: string;
	supervisorId: string | undefined;
	isActive: boolean;
}

/** Initial form state for the track dialog: edit seeds from the track, add is blank. */
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

/** Validation message for a track name, or null when valid. */
export function validateTrackName(name: string): string | null {
	if (!name.trim()) return "Track name is required";
	if (name.length > 200) return "Track name must be at most 200 characters";
	return null;
}

/** Maps the supervisor select value ("none" / undefined / id) to a nullable id. */
export function normalizeSupervisorId(
	supervisorId: string | undefined,
): string | null {
	return supervisorId === "none" ? null : (supervisorId ?? null);
}

/** Title, description and submit label for the dialog, by mode. */
export function trackDialogLabels(isEdit: boolean): {
	title: string;
	description: string;
	submitLabel: string;
} {
	return {
		title: isEdit ? "Edit Track" : "Create Track",
		description: isEdit
			? "Update track details"
			: "Create a new conference track",
		submitLabel: isEdit ? "Save" : "Create",
	};
}
