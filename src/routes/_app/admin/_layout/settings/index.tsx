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
	IconShieldCheck,
} from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { z } from "zod";
import { adminOnlyRouteMiddleware } from "@/features/auth/server/middleware";
import { EmailTemplatesTab } from "@/features/email-templates";
import { emailTemplatesQueryOptions } from "@/features/email-templates/api/email-templates";
import { toEmailTemplateUI } from "@/features/email-templates/components/admin/email-templates-tab";
import {
	extractionAdminSettingsQueryOptions,
	llmHealthQueryOptions,
	pdfApiHealthQueryOptions,
} from "@/features/extraction/api/extraction";
import { paymentInstructionsQueryOptions } from "@/features/fee/api/fee";
import { FeeTab } from "@/features/fee/components/admin/fee-tab";
import { FinancesSettingsTab } from "@/features/finances/components/admin/finances-settings-tab";
import { allRoomsQueryOptions } from "@/features/planner/api/rooms";
import { allProgramTracksQueryOptions } from "@/features/planner/api/tracks";
import { ProgramTab } from "@/features/planner/components/program";
import { reviewerUsersQueryOptions } from "@/features/reviews/api/reviewers";
import { documentSigningQueryOptions } from "@/features/settings/api/document-signing";
import {
	adminSettingQueryOptions,
	brandingSettingsQueryOptions,
	conferenceSettingsQueryOptions,
	emailFooterQueryOptions,
	feeCurrencyQueryOptions,
	feeTypesQueryOptions,
	financesEnabledQueryOptions,
	financesVatRatesQueryOptions,
	reminderSettingsQueryOptions,
	submissionTypesConfigQueryOptions,
	submissionValidationSettingsQueryOptions,
} from "@/features/settings/api/settings";
import { BrandingSettingsTab } from "@/features/settings/components/branding/branding-settings-tab";
import { ConferenceSettingsTab } from "@/features/settings/components/conference/conference-settings-tab";
import { DocumentSigningTab } from "@/features/settings/components/documents/document-signing-tab";
import { InvitationsSettingsTab } from "@/features/settings/components/invitations/invitations-settings-tab";
import { RemindersSettingsTab } from "@/features/settings/components/reminders/reminders-settings-tab";
import { SubmissionSettingsTab } from "@/features/settings/components/submission/submission-settings-tab";
import { SubmissionTypesTab } from "@/features/settings/components/submission/submission-types-tab";
import { TosContentTab } from "@/features/settings/components/tos/tos-content-tab";
import { adminSurveyQuestionsQueryOptions } from "@/features/survey/api/survey";
import { SurveyQuestionsTab } from "@/features/survey/components/admin/survey-questions-tab";
import { allTracksQueryOptions } from "@/features/tracks/api/admin-tracks";
import { TracksTab } from "@/features/tracks/components/admin/tracks-tab";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

const searchSchema = z.object({
	tab: z.string().optional(),
});

export const Route = createFileRoute("/_app/admin/_layout/settings/")({
	server: {
		middleware: [adminOnlyRouteMiddleware],
	},
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
				adminSettingQueryOptions("PROGRAM_BADGES"),
			),
			context.queryClient.ensureQueryData(
				adminSettingQueryOptions("INVITATION_VALIDITY_HOURS"),
			),
			context.queryClient.ensureQueryData(
				adminSettingQueryOptions("FEE_ENABLED"),
			),
			context.queryClient.ensureQueryData(feeTypesQueryOptions()),
			context.queryClient.ensureQueryData(feeCurrencyQueryOptions()),
			context.queryClient.ensureQueryData(financesEnabledQueryOptions()),
			context.queryClient.ensureQueryData(financesVatRatesQueryOptions()),
			context.queryClient.ensureQueryData(
				extractionAdminSettingsQueryOptions(),
			),
			context.queryClient.ensureQueryData(llmHealthQueryOptions()),
			context.queryClient.ensureQueryData(pdfApiHealthQueryOptions()),
			context.queryClient.ensureQueryData(allRoomsQueryOptions()),
			context.queryClient.ensureQueryData(allProgramTracksQueryOptions()),
			context.queryClient.ensureQueryData(documentSigningQueryOptions()),
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
	{ id: "finances", label: "Finances", icon: IconCash },
	{ id: "reminders", label: "Reminders", icon: IconBell },
	{ id: "survey", label: "Survey", icon: IconClipboardList },
	{ id: "documents", label: "Documents", icon: IconShieldCheck },
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
	const { data: feeEnabled } = useSuspenseQuery(
		adminSettingQueryOptions("FEE_ENABLED"),
	);
	const { data: feeTypes } = useSuspenseQuery(feeTypesQueryOptions());
	const { data: feeCurrency } = useSuspenseQuery(feeCurrencyQueryOptions());
	const { data: financesEnabled } = useSuspenseQuery(
		financesEnabledQueryOptions(),
	);
	const { data: financesVatRates } = useSuspenseQuery(
		financesVatRatesQueryOptions(),
	);
	const { data: extractionSettings } = useSuspenseQuery(
		extractionAdminSettingsQueryOptions(),
	);
	const { data: llmHealth } = useSuspenseQuery(llmHealthQueryOptions());
	const { data: pdfApiHealth } = useSuspenseQuery(pdfApiHealthQueryOptions());
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const { data: programTracks } = useSuspenseQuery(
		allProgramTracksQueryOptions(),
	);

	const emailTemplates = emailTemplatesRaw.map(toEmailTemplateUI);

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconSettings} title="Settings" />
			<div className="fade flex-1 overflow-auto p-4 sm:p-8">
				<div className="mx-auto max-w-5xl">
					<Tabs
						onValueChange={(value) =>
							navigate({
								search: { tab: value },
								replace: true,
								resetScroll: false,
							})
						}
						value={activeTab}
					>
						<TabsList className="border-border bg-muted mb-6 h-auto flex-wrap gap-1 rounded-lg border p-1">
							{tabs.map((tab) => (
								<TabsTrigger
									className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground gap-1.5 px-3 py-2 data-[state=active]:shadow-sm"
									data-testid={`settings-tab-${tab.id}`}
									key={tab.id}
									value={tab.id}
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
								initialExtraction={extractionSettings}
								initialReviewGuidelines={reviewGuidelines}
								initialSubmissionGuidelines={submissionGuidelines}
								llmHealth={llmHealth}
								pdfApiHealth={pdfApiHealth}
							/>
						</TabsContent>

						<TabsContent value="types">
							<SubmissionTypesTab initialData={submissionTypes} />
						</TabsContent>

						<TabsContent value="tracks">
							<TracksTab
								initialTracks={tracks}
								onUpdate={() =>
									queryClient.invalidateQueries({
										queryKey: allTracksQueryOptions().queryKey,
									})
								}
								reviewers={reviewers}
							/>
						</TabsContent>

						<TabsContent value="program">
							<ProgramTab
								initialConferenceSettings={conferenceSettings}
								initialProgramTracks={programTracks}
								initialRooms={rooms}
								llmHealth={llmHealth}
								onProgramTracksUpdate={() =>
									queryClient.invalidateQueries({
										queryKey: allProgramTracksQueryOptions().queryKey,
									})
								}
								onRoomsUpdate={() =>
									queryClient.invalidateQueries({
										queryKey: allRoomsQueryOptions().queryKey,
									})
								}
							/>
						</TabsContent>

						<TabsContent value="emails">
							<EmailTemplatesTab
								initialData={emailTemplates}
								initialFooter={emailFooter}
							/>
						</TabsContent>

						<TabsContent value="branding">
							<BrandingSettingsTab initialData={brandingSettings} />
						</TabsContent>

						<TabsContent value="fee">
							<FeeTab
								currency={feeCurrency}
								initialEnabled={feeEnabled}
								initialFeeTypes={feeTypes}
								initialInstructions={feeInstructions}
							/>
						</TabsContent>

						<TabsContent value="finances">
							<FinancesSettingsTab
								initialEnabled={financesEnabled}
								initialVatRates={financesVatRates}
							/>
						</TabsContent>

						<TabsContent value="reminders">
							<RemindersSettingsTab initialData={reminderSettings} />
						</TabsContent>

						<TabsContent value="survey">
							<SurveyQuestionsTab
								exhibitorsEnabled={submissionTypes.EXHIBITOR.isActive}
								initialQuestions={surveyQuestions}
							/>
						</TabsContent>

						<TabsContent value="documents">
							<DocumentSigningTab conferenceName={conferenceSettings.name} />
						</TabsContent>

						<TabsContent value="tos">
							<TosContentTab initialContent={tosContent} />
						</TabsContent>

						<TabsContent value="invitations">
							<InvitationsSettingsTab
								initialValidityHours={invitationValidityHours}
							/>
						</TabsContent>
					</Tabs>

					<div className="h-12" />
				</div>
			</div>
		</div>
	);
}
