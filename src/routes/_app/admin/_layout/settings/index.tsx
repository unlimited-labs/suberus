import {
	IconBell,
	IconBuilding,
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
import { SessionsTab } from "@/components/admin/sessions/sessions-tab";
import {
	BrandingSettingsTab,
	ConferenceSettingsTab,
	EmailTemplatesTab,
	FeeInstructionsTab,
	InvitationsSettingsTab,
	RemindersSettingsTab,
	SubmissionSettingsTab,
	SubmissionTypesTab,
	SurveyQuestionsTab,
	TosContentTab,
} from "@/components/admin/settings";
import { toEmailTemplateUI } from "@/components/admin/settings/email-templates-tab";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { emailTemplatesQueryOptions } from "@/utils/email-templates.functions";
import { paymentInstructionsQueryOptions } from "@/utils/fee.functions";
import {
	allSessionsQueryOptions,
	reviewerUsersQueryOptions,
} from "@/utils/sessions.functions";
import {
	adminSettingQueryOptions,
	brandingSettingsQueryOptions,
	conferenceSettingsQueryOptions,
	emailFooterQueryOptions,
	reminderSettingsQueryOptions,
	submissionTypesConfigQueryOptions,
	submissionValidationSettingsQueryOptions,
} from "@/utils/settings.functions";
import { adminSurveyQuestionsQueryOptions } from "@/utils/survey.functions";

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
			context.queryClient.ensureQueryData(allSessionsQueryOptions()),
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
		]);
	},
	component: AdminSettingsPage,
});

const tabs = [
	{ id: "conference", label: "Conference", icon: IconBuilding },
	{ id: "submissions", label: "Submissions", icon: IconFileText },
	{ id: "types", label: "Submission Types", icon: IconFileStack },
	{ id: "sessions", label: "Sessions", icon: IconPresentation },
	{ id: "emails", label: "Email Templates", icon: IconMail },
	{ id: "branding", label: "Branding", icon: IconPalette },
	{ id: "fee-instructions", label: "Fee Instructions", icon: IconCash },
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
	const { data: sessions } = useSuspenseQuery(allSessionsQueryOptions());
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
							<ConferenceSettingsTab initialData={conferenceSettings} />
						</TabsContent>

						<TabsContent value="submissions">
							<SubmissionSettingsTab
								initialData={submissionSettings}
								initialSubmissionGuidelines={submissionGuidelines as string}
								initialReviewGuidelines={reviewGuidelines as string}
							/>
						</TabsContent>

						<TabsContent value="types">
							<SubmissionTypesTab initialData={submissionTypes} />
						</TabsContent>

						<TabsContent value="sessions">
							<SessionsTab
								initialSessions={sessions}
								reviewers={reviewers}
								onUpdate={() =>
									queryClient.invalidateQueries({
										queryKey: allSessionsQueryOptions().queryKey,
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

						<TabsContent value="fee-instructions">
							<FeeInstructionsTab initialInstructions={feeInstructions} />
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
