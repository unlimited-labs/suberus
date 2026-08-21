import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { publicParticipantsQueryOptions } from "@/features/planner/api/participants";
import { publicConferenceInfoQueryOptions } from "@/features/planner/api/schedule";
import { ParticipantsList } from "@/features/planner/components/public-program/participants-list";
import { ProgramFrame } from "@/features/planner/components/public-program/program-shell";
import { resolveProgramTheme } from "@/features/planner/components/public-program/themes/registry";

export const Route = createFileRoute("/program/participants")({
	loader: async ({ context }) => {
		const settings = await context.queryClient.ensureQueryData(
			publicConferenceInfoQueryOptions(),
		);
		if (!settings.viewerIsAuthenticated) throw redirect({ to: "/login" });
		if (!settings.showAuthorInfo || !settings.viewerIsParticipant) {
			throw redirect({ to: "/program" });
		}
		await context.queryClient.ensureQueryData(publicParticipantsQueryOptions());
		return { conferenceName: settings.name };
	},
	head: ({ loaderData }) => ({
		meta: [
			{
				title: loaderData?.conferenceName
					? `Participants — ${loaderData.conferenceName}`
					: "Participants",
			},
		],
	}),
	component: ParticipantsPage,
});

function ParticipantsPage() {
	const { data: settings } = useSuspenseQuery(
		publicConferenceInfoQueryOptions(),
	);
	const { data: participants } = useSuspenseQuery(
		publicParticipantsQueryOptions(),
	);
	const [search, setSearch] = useState("");
	const q = search.trim().toLowerCase();

	const filtered = useMemo(
		() =>
			(participants ?? []).filter((p) =>
				`${p.firstName} ${p.lastName} ${p.affiliationName ?? ""}`
					.toLowerCase()
					.includes(q),
			),
		[participants, q],
	);

	const theme = resolveProgramTheme(settings.theme);

	return (
		<ProgramFrame
			chrome={theme.chrome}
			search={search}
			searchPlaceholder="Search participants…"
			setSearch={setSearch}
			settings={settings}
			themeId={theme.id}
		>
			{participants ? (
				<ParticipantsList
					participants={filtered}
					query={q}
					themeId={theme.id}
				/>
			) : (
				<p className="text-muted-foreground py-20 text-center text-lg">
					The participant list is not available.
				</p>
			)}
		</ProgramFrame>
	);
}
