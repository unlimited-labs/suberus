import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	publicConferenceInfoQueryOptions,
	publicProgramQueryOptions,
} from "@/features/planner/api/schedule";
import { ProgramInteractionProvider } from "@/features/planner/components/public-program/program-interaction";
import { resolveProgramTheme } from "@/features/planner/components/public-program/themes/registry";
import { ProgramEmptyState } from "@/features/planner/components/public-program/themes/shared";
import { useProgramSchedule } from "@/features/planner/components/public-program/use-program-schedule";
import { getAppBrandingFn } from "@/features/settings/api/settings";

export const Route = createFileRoute("/program/")({
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(publicProgramQueryOptions()),
			context.queryClient.ensureQueryData(publicConferenceInfoQueryOptions()),
		]);
	},
	head: async () => {
		const branding = await getAppBrandingFn();
		return {
			meta: [
				{
					title: branding.conferenceName
						? `Program — ${branding.conferenceName}`
						: "Program",
				},
			],
		};
	},
	component: ProgramPage,
});

function ProgramPage() {
	const { data: program } = useSuspenseQuery(publicProgramQueryOptions());
	const { data: settings } = useSuspenseQuery(
		publicConferenceInfoQueryOptions(),
	);
	const [search, setSearch] = useState("");
	const [activeDay, setActiveDay] = useState(0);
	const schedule = useProgramSchedule({ program, settings, search, activeDay });

	if (!program) return <ProgramEmptyState />;

	const Theme = resolveProgramTheme(settings.theme).component;

	return (
		<ProgramInteractionProvider themeId={settings.theme}>
			<Theme
				settings={settings}
				search={search}
				setSearch={setSearch}
				activeDay={activeDay}
				setActiveDay={setActiveDay}
				schedule={schedule}
			/>
		</ProgramInteractionProvider>
	);
}
