import type { PublicConferenceInfo } from "@/features/planner/api/schedule";
import type { useProgramSchedule } from "../use-program-schedule";

export interface ProgramThemeProps {
	settings: PublicConferenceInfo;
	search: string;
	setSearch: (value: string) => void;
	activeDay: number;
	setActiveDay: (index: number) => void;
	schedule: ReturnType<typeof useProgramSchedule>;
}

export type ProgramChrome = "minimal" | "framed";
export type ProgramLayout = "list" | "grid";

export interface ProgramThemeMeta {
	id: string;
	name: string;
	description: string;
	brandingAware: boolean;
	chrome: ProgramChrome;
	layout: ProgramLayout;
}

export const PROGRAM_THEMES = {
	default: {
		id: "default",
		name: "Default",
		description: "Clean layout that follows your branding colours.",
		brandingAware: true,
		chrome: "minimal",
		layout: "list",
	},
	editorial: {
		id: "editorial",
		name: "Editorial",
		description: "Print-inspired newspaper look with its own fixed palette.",
		brandingAware: false,
		chrome: "framed",
		layout: "list",
	},
	academic: {
		id: "academic",
		name: "Academic",
		description:
			"Formal room-by-time timetable grid with a fixed scholarly palette.",
		brandingAware: false,
		chrome: "framed",
		layout: "grid",
	},
} satisfies Record<string, ProgramThemeMeta>;

export const PROGRAM_THEME_LIST: ProgramThemeMeta[] =
	Object.values(PROGRAM_THEMES);

export function resolveProgramTheme(id: string): ProgramThemeMeta {
	return (
		(PROGRAM_THEMES as Record<string, ProgramThemeMeta>)[id] ??
		PROGRAM_THEMES.default
	);
}
