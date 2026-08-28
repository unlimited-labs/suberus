import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	publicConferenceInfoQueryOptions,
	publicProgramQueryOptions,
} from "@/features/planner/api/schedule";
import { ProgramInteractionProvider } from "@/features/planner/components/public-program/program-interaction";
import { ProgramShell } from "@/features/planner/components/public-program/program-shell";
import { resolveProgramTheme } from "@/features/planner/components/public-program/themes/registry";
import { ProgramEmptyState } from "@/features/planner/components/public-program/themes/shared";
import { useProgramSchedule } from "@/features/planner/components/public-program/use-program-schedule";

export const Route = createFileRoute("/program/")({
	loader: async ({ context }) => {
		const [, settings] = await Promise.all([
			context.queryClient.ensureQueryData(publicProgramQueryOptions()),
			context.queryClient.ensureQueryData(publicConferenceInfoQueryOptions()),
		]);
		return { conferenceName: settings.name };
	},
	// Title comes from the loader's cached settings, not its own server call:
	// offline hydration must not depend on a fetch.
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData?.conferenceName
					? `Program — ${loaderData.conferenceName}`
					: "Program",
			},
		],
	}),
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

	const theme = resolveProgramTheme(settings.theme);

	return (
		<ProgramInteractionProvider
			badges={settings.badges}
			showAuthorInfo={settings.showAuthorInfo && settings.viewerIsParticipant}
			themeId={theme.id}
		>
			<ProgramShell
				activeDay={activeDay}
				chrome={theme.chrome}
				layout={theme.layout}
				schedule={schedule}
				search={search}
				setActiveDay={setActiveDay}
				setSearch={setSearch}
				settings={settings}
				themeId={theme.id}
			/>
		</ProgramInteractionProvider>
	);
}
