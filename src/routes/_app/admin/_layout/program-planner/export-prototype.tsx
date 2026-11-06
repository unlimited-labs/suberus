// PROTOTYPE (throwaway): 3 variants of the printed-program export page, switch with ?variant=A|B|C
// (bottom bar or ←/→). ?sidecar=off shows IDML unavailable. Never merge.
import { IconFileExport } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { adminRouteMiddleware } from "@/features/auth/server/middleware";
import { allBreaksQueryOptions } from "@/features/planner/api/breaks";
import { allRoomsQueryOptions } from "@/features/planner/api/rooms";
import {
	scheduleIssuesQueryOptions,
	scheduleStateQueryOptions,
} from "@/features/planner/api/schedule";
import { allSessionsQueryOptions } from "@/features/planner/api/sessions";
import type { ExportPageData } from "@/features/planner/components/print-export-prototype/export-state";
import { PrototypeSwitcher } from "@/features/planner/components/print-export-prototype/prototype-switcher";
import {
	VARIANT_A_NAME,
	VariantA,
} from "@/features/planner/components/print-export-prototype/variant-a";
import {
	VARIANT_B_NAME,
	VariantB,
} from "@/features/planner/components/print-export-prototype/variant-b";
import {
	VARIANT_C_NAME,
	VariantC,
} from "@/features/planner/components/print-export-prototype/variant-c";
import { conferenceSettingsQueryOptions } from "@/features/settings/api/settings";
import { PageHeader } from "@/shared/components/layout/page-header";

const searchSchema = z.object({
	format: z.enum(["docx", "idml", "xlsx"]).catch("docx"),
	variant: z.enum(["A", "B", "C"]).catch("A"),
	sidecar: z.enum(["on", "off"]).catch("on"),
});

const VARIANTS = [
	{ key: "A", name: VARIANT_A_NAME },
	{ key: "B", name: VARIANT_B_NAME },
	{ key: "C", name: VARIANT_C_NAME },
] as const;

export const Route = createFileRoute(
	"/_app/admin/_layout/program-planner/export-prototype",
)({
	server: { middleware: [adminRouteMiddleware] },
	validateSearch: searchSchema,
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(allRoomsQueryOptions()),
			context.queryClient.ensureQueryData(allSessionsQueryOptions()),
			context.queryClient.ensureQueryData(allBreaksQueryOptions()),
			context.queryClient.ensureQueryData(conferenceSettingsQueryOptions()),
			context.queryClient.ensureQueryData(scheduleStateQueryOptions()),
			context.queryClient.ensureQueryData(scheduleIssuesQueryOptions()),
		]);
	},
	component: ExportPrototypePage,
});

function ExportPrototypePage() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const { data: sessions } = useSuspenseQuery(allSessionsQueryOptions());
	const { data: breaks } = useSuspenseQuery(allBreaksQueryOptions());
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());
	const { data: state } = useSuspenseQuery(scheduleStateQueryOptions());
	const { data: issues } = useSuspenseQuery(scheduleIssuesQueryOptions());
	const tz = settings.timezone || "UTC";

	const data: ExportPageData = {
		sessions,
		breaks,
		roomOrder: rooms.toSorted((a, b) => a.order - b.order).map((r) => r.name),
		tz,
		conferenceName: settings.name || "Conference",
		dates: [settings.conferenceStartDate, settings.conferenceEndDate]
			.filter(Boolean)
			.join(" – "),
		draft: state.status !== "PUBLISHED",
		issues,
		sidecarAvailable: search.sidecar === "on",
	};
	const props = {
		data,
		format: search.format,
		onFormatChange: (format: typeof search.format) =>
			void navigate({ search: (s) => ({ ...s, format }), replace: true }),
	};

	return (
		<>
			<PageHeader
				icon={IconFileExport}
				title={`Export printed program${data.draft ? " (draft)" : ""}`}
			/>
			{search.variant === "A" && <VariantA {...props} />}
			{search.variant === "B" && <VariantB {...props} />}
			{search.variant === "C" && <VariantC {...props} />}
			<PrototypeSwitcher
				current={search.variant}
				onChange={(variant) =>
					void navigate({ search: (s) => ({ ...s, variant }), replace: true })
				}
				variants={VARIANTS}
			/>
		</>
	);
}
