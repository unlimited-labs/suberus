import {
	IconBell,
	IconBuilding,
	IconCalendarEvent,
	IconCash,
	IconClipboardList,
	IconFileStack,
	IconFileText,
	IconMail,
	IconMailPlus,
	IconPalette,
	IconPresentation,
	IconScale,
	IconSettings,
} from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { z } from "zod";
import { ProgramTab } from "@/components/admin/program";
import { EmailTemplatesTab } from "@/features/email-templates";
import { emailTemplatesQueryOptions } from "@/features/email-templates/api/email-templates";
import { toEmailTemplateUI } from "@/features/email-templates/components/admin/email-templates-tab";
import {
	doclingHealthQueryOptions,
	extractionAdminSettingsQueryOptions,
	llmHealthQueryOptions,
} from "@/features/extraction/api/extraction";
import { paymentInstructionsQueryOptions } from "@/features/fee/api/fee";
import { FeeTab } from "@/features/fee/components/admin/fee-tab";
import { reviewerUsersQueryOptions } from "@/features/reviews/api/reviewers";
import {
	adminSettingQueryOptions,
	brandingSettingsQueryOptions,
	conferenceSettingsQueryOptions,
	emailFooterQueryOptions,
	feeCurrencyQueryOptions,
	feeTypesQueryOptions,
	reminderSettingsQueryOptions,
	submissionTypesConfigQueryOptions,
	submissionValidationSettingsQueryOptions,
} from "@/features/settings/api/settings";
import { BrandingSettingsTab } from "@/features/settings/components/branding/branding-settings-tab";
import { ConferenceSettingsTab } from "@/features/settings/components/conference/conference-settings-tab";
import { InvitationsSettingsTab } from "@/features/settings/components/invitations/invitations-settings-tab";
import { RemindersSettingsTab } from "@/features/settings/components/reminders/reminders-settings-tab";
import { SubmissionSettingsTab } from "@/features/settings/components/submission/submission-settings-tab";
import { SubmissionTypesTab } from "@/features/settings/components/submission/submission-types-tab";
import { TosContentTab } from "@/features/settings/components/tos/tos-content-tab";
import { adminSurveyQuestionsQueryOptions } from "@/features/survey/api/survey";
import { SurveyQuestionsTab } from "@/features/survey/components/admin/survey-questions-tab";
import { allTracksQueryOptions } from "@/features/tracks/api/admin-tracks";
import { TracksTab } from "@/features/tracks/components/admin/tracks-tab";
import { allRoomsQueryOptions } from "@/server-fns/planner/rooms";
import { allProgramTracksQueryOptions } from "@/server-fns/planner/tracks";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

const searchSchema = z.object({
	tab: z.string().optional(),
});

export const Route = createFileRoute("/_app/admin/_layout/settings/")({
	validateSearch: searchSchema,
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(conferenceSettingsQueryOptions()),
			context.queryClient.ensureQueryData(submissionTypesConfigQueryOptions()),
			context.queryClient.ensureQueryData(
				submissionValidationSettingsQueryOptions(),
			),
			context.queryClient.ensureQueryData(paymentInstructionsQueryOptions()),
			context.queryClient.ensureQueryData(brandingSettingsQueryOptions()),
			context.queryClient.ensureQueryData(allTracksQueryOptions()),
			context.queryClient.ensureQueryData(reviewerUsersQueryOptions()),
			context.queryClient.ensureQueryData(reminderSettingsQueryOptions()),
			context.queryClient.ensureQueryData(emailTemplatesQueryOptions()),
			context.queryClient.ensureQueryData(
				adminSettingQueryOptions("SUBMISSION_GUIDELINES"),
			),
			context.queryClient.ensureQueryData(
				adminSettingQueryOptions("REVIEW_GUIDELINES"),
			),
			context.queryClient.ensureQueryData(emailFooterQueryOptions()),
			context.queryClient.ensureQueryData(adminSurveyQuestionsQueryOptions()),
			context.queryClient.ensureQueryData(
				adminSettingQueryOptions("TOS_CONTENT"),
			),
			context.queryClient.ensureQueryData(
				adminSettingQueryOptions("INVITATION_VALIDITY_HOURS"),
			),
			context.queryClient.ensureQueryData(feeTypesQueryOptions()),
			context.queryClient.ensureQueryData(feeCurrencyQueryOptions()),
			context.queryClient.ensureQueryData(
				extractionAdminSettingsQueryOptions(),
			),
			context.queryClient.ensureQueryData(llmHealthQueryOptions()),
			context.queryClient.ensureQueryData(doclingHealthQueryOptions()),
			context.queryClient.ensureQueryData(allRoomsQueryOptions()),
			context.queryClient.ensureQueryData(allProgramTracksQueryOptions()),
		]);
	},
	component: AdminSettingsPage,
});

const tabs = [
	{ id: "conference", label: "Conference", icon: IconBuilding },
	{ id: "submissions", label: "Submissions", icon: IconFileText },
	{ id: "types", label: "Submission Types", icon: IconFileStack },
	{ id: "tracks", label: "Tracks", icon: IconPresentation },
	{ id: "program", label: "Program", icon: IconCalendarEvent },
	{ id: "emails", label: "Email Templates", icon: IconMail },
	{ id: "branding", label: "Branding", icon: IconPalette },
	{ id: "fee", label: "Fee", icon: IconCash },
	{ id: "reminders", label: "Reminders", icon: IconBell },
	{ id: "survey", label: "Survey", icon: IconClipboardList },
	{ id: "tos", label: "Terms of Service", icon: IconScale },
	{ id: "invitations", label: "Invitations", icon: IconMailPlus },
];

function AdminSettingsPage() {
	const queryClient = useQueryClient();
	const { tab } = useSearch({ from: "/_app/admin/_layout/settings/" });
	const activeTab = tab ?? "conference";
	const navigate = useNavigate({ from: Route.fullPath });

	const { data: conferenceSettings } = useSuspenseQuery(
		conferenceSettingsQueryOptions(),
	);
	const { data: submissionTypes } = useSuspenseQuery(
		submissionTypesConfigQueryOptions(),
	);
	const { data: submissionSettings } = useSuspenseQuery(
		submissionValidationSettingsQueryOptions(),
	);
	const { data: feeInstructions } = useSuspenseQuery(
		paymentInstructionsQueryOptions(),
	);
	const { data: brandingSettings } = useSuspenseQuery(
		brandingSettingsQueryOptions(),
	);
	const { data: tracks } = useSuspenseQuery(allTracksQueryOptions());
	const { data: reviewers } = useSuspenseQuery(reviewerUsersQueryOptions());
	const { data: reminderSettings } = useSuspenseQuery(
		reminderSettingsQueryOptions(),
	);
	const { data: emailTemplatesRaw } = useSuspenseQuery(
		emailTemplatesQueryOptions(),
	);
	const { data: submissionGuidelines } = useSuspenseQuery(
		adminSettingQueryOptions("SUBMISSION_GUIDELINES"),
	);
	const { data: reviewGuidelines } = useSuspenseQuery(
		adminSettingQueryOptions("REVIEW_GUIDELINES"),
	);
	const { data: emailFooter } = useSuspenseQuery(emailFooterQueryOptions());
	const { data: surveyQuestions } = useSuspenseQuery(
		adminSurveyQuestionsQueryOptions(),
	);
	const { data: tosContent } = useSuspenseQuery(
		adminSettingQueryOptions("TOS_CONTENT"),
	);
	const { data: invitationValidityHours } = useSuspenseQuery(
		adminSettingQueryOptions("INVITATION_VALIDITY_HOURS"),
	);
	const { data: feeTypes } = useSuspenseQuery(feeTypesQueryOptions());
	const { data: feeCurrency } = useSuspenseQuery(feeCurrencyQueryOptions());
	const { data: extractionSettings } = useSuspenseQuery(
		extractionAdminSettingsQueryOptions(),
	);
	const { data: llmHealth } = useSuspenseQuery(llmHealthQueryOptions());
	const { data: doclingHealth } = useSuspenseQuery(doclingHealthQueryOptions());
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const { data: programTracks } = useSuspenseQuery(
		allProgramTracksQueryOptions(),
	);

	const emailTemplates = emailTemplatesRaw.map(toEmailTemplateUI);

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconSettings} title="Configuration" />
			<div className="flex-1 overflow-auto p-4 sm:p-8">
				<div className="mx-auto max-w-5xl">
					<Tabs
						value={activeTab}
						onValueChange={(value) =>
							navigate({
								search: { tab: value },
								replace: true,
								resetScroll: false,
							})
						}
					>
						<TabsList className="mb-6 h-auto flex-wrap gap-1 rounded-lg border border-border bg-muted p-1">
							{tabs.map((tab) => (
								<TabsTrigger
									key={tab.id}
									value={tab.id}
									className="gap-1.5 px-3 py-2 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
								>
									<tab.icon className="size-4" />
									<span className="hidden sm:inline">{tab.label}</span>
								</TabsTrigger>
							))}
						</TabsList>

						<TabsContent value="conference">
							<ConferenceSettingsTab
								initialData={conferenceSettings}
								initialExhibitorConfig={submissionTypes.EXHIBITOR}
							/>
						</TabsContent>

						<TabsContent value="submissions">
							<SubmissionSettingsTab
								initialData={submissionSettings}
								initialSubmissionGuidelines={submissionGuidelines as string}
								initialReviewGuidelines={reviewGuidelines as string}
								initialExtraction={extractionSettings}
								llmHealth={llmHealth}
								doclingHealth={doclingHealth}
							/>
						</TabsContent>

						<TabsContent value="types">
							<SubmissionTypesTab initialData={submissionTypes} />
						</TabsContent>

						<TabsContent value="tracks">
							<TracksTab
								initialTracks={tracks}
								reviewers={reviewers}
								onUpdate={() =>
									queryClient.invalidateQueries({
										queryKey: allTracksQueryOptions().queryKey,
									})
								}
							/>
						</TabsContent>

						<TabsContent value="program">
							<ProgramTab
								initialRooms={rooms}
								initialProgramTracks={programTracks}
								initialConferenceSettings={conferenceSettings}
								llmHealth={llmHealth}
								onRoomsUpdate={() =>
									queryClient.invalidateQueries({
										queryKey: allRoomsQueryOptions().queryKey,
									})
								}
								onProgramTracksUpdate={() =>
									queryClient.invalidateQueries({
										queryKey: allProgramTracksQueryOptions().queryKey,
									})
								}
							/>
						</TabsContent>

						<TabsContent value="emails">
							<EmailTemplatesTab
								initialData={emailTemplates}
								initialFooter={emailFooter as string}
							/>
						</TabsContent>

						<TabsContent value="branding">
							<BrandingSettingsTab initialData={brandingSettings} />
						</TabsContent>

						<TabsContent value="fee">
							<FeeTab
								initialInstructions={feeInstructions}
								initialFeeTypes={
									feeTypes as Array<{
										id: string;
										name: string;
										amount: number;
									}>
								}
								currency={feeCurrency as string}
							/>
						</TabsContent>

						<TabsContent value="reminders">
							<RemindersSettingsTab initialData={reminderSettings} />
						</TabsContent>

						<TabsContent value="survey">
							<SurveyQuestionsTab initialQuestions={surveyQuestions} />
						</TabsContent>

						<TabsContent value="tos">
							<TosContentTab initialContent={tosContent as string} />
						</TabsContent>

						<TabsContent value="invitations">
							<InvitationsSettingsTab
								initialValidityHours={invitationValidityHours as number}
							/>
						</TabsContent>
					</Tabs>

					<div className="h-12" />
				</div>
			</div>
		</div>
	);
}
