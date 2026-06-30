import type { ComponentType } from "react";
import type { PublicConferenceInfo } from "@/features/planner/api/schedule";
import type { useProgramSchedule } from "../use-program-schedule";
import { AcademicProgram } from "./academic";
import { DefaultProgram } from "./default";
import { EditorialProgram } from "./editorial";

export interface ProgramThemeProps {
	settings: PublicConferenceInfo;
	search: string;
	setSearch: (value: string) => void;
	activeDay: number;
	setActiveDay: (index: number) => void;
	schedule: ReturnType<typeof useProgramSchedule>;
}

export interface ProgramThemeMeta {
	id: string;
	name: string;
	description: string;
	brandingAware: boolean;
	component: ComponentType<ProgramThemeProps>;
}

export const PROGRAM_THEMES = {
	default: {
		id: "default",
		name: "Default",
		description: "Clean layout that follows your branding colours.",
		brandingAware: true,
		component: DefaultProgram,
	},
	editorial: {
		id: "editorial",
		name: "Editorial",
		description: "Print-inspired newspaper look with its own fixed palette.",
		brandingAware: false,
		component: EditorialProgram,
	},
	academic: {
		id: "academic",
		name: "Academic",
		description:
			"Formal room-by-time timetable grid with a fixed scholarly palette.",
		brandingAware: false,
		component: AcademicProgram,
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
