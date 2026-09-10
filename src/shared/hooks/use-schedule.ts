import { useState } from "react";
import { isFutureInstant, localInputToIso } from "@/shared/lib/schedule";

export interface ScheduleControl {
	enabled: boolean;
	setEnabled: (enabled: boolean) => void;
	local: string;
	setLocal: (local: string) => void;
	iso: string | null;
	ready: boolean;
}

export function useSchedule(): ScheduleControl {
	const [enabled, setEnabled] = useState(false);
	const [local, setLocal] = useState("");

	const parsed = enabled ? localInputToIso(local) : null;
	const iso = parsed && isFutureInstant(parsed) ? parsed : null;

	return {
		enabled,
		setEnabled,
		local,
		setLocal,
		iso,
		ready: !enabled || !!iso,
	};
}
