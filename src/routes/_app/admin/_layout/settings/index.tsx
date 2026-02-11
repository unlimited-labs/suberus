import {
	IconBell,
	IconBuilding,
	IconCash,
	IconFileStack,
	IconFileText,
	IconMail,
	IconPalette,
	IconPresentation,
	IconSettings,
} from "@tabler/icons-react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { SessionsTab } from "@/components/admin/sessions/sessions-tab";
import {
	BrandingSettingsTab,
	ConferenceSettingsTab,
	EmailTemplatesTab,
	FeeInstructionsTab,
	RemindersSettingsTab,
	SubmissionSettingsTab,
	SubmissionTypesTab,
} from "@/components/admin/settings";
import { toEmailTemplateUI } from "@/components/admin/settings/email-templates-tab";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEmailTemplatesFn } from "@/utils/email-templates.functions";
import { getPaymentInstructionsFn } from "@/utils/fee.functions";
import {
	getAllSessionsFn,
	getReviewerUsersFn,
} from "@/utils/sessions.functions";
import {
	getBrandingSettingsFn,
	getConferenceSettingsFn,
	getEmailFooterFn,
	getReminderSettingsFn,
	getSettingFn,
	getSubmissionTypeConfigsFn,
	getSubmissionValidationSettingsFn,
} from "@/utils/settings.functions";

export const Route = createFileRoute("/_app/admin/_layout/settings/")({
	loader: async () => {
		const [
			conferenceSettings,
			submissionTypes,
			submissionSettings,
			feeInstructions,
			brandingSettings,
			sessions,
			reviewers,
			reminderSettings,
			emailTemplatesRaw,
			submissionGuidelines,
			reviewGuidelines,
			emailFooter,
		] = await Promise.all([
			getConferenceSettingsFn(),
			getSubmissionTypeConfigsFn(),
			getSubmissionValidationSettingsFn(),
			getPaymentInstructionsFn(),
			getBrandingSettingsFn(),
			getAllSessionsFn(),
			getReviewerUsersFn(),
			getReminderSettingsFn(),
			getEmailTemplatesFn(),
			getSettingFn({ data: { key: "SUBMISSION_GUIDELINES" } }),
			getSettingFn({ data: { key: "REVIEW_GUIDELINES" } }),
			getEmailFooterFn(),
		]);
		return {
			conferenceSettings,
			submissionTypes,
			submissionSettings,
			feeInstructions,
			brandingSettings,
			sessions,
			reviewers,
			reminderSettings,
			emailTemplates: emailTemplatesRaw.map(toEmailTemplateUI),
			submissionGuidelines: submissionGuidelines as string,
			reviewGuidelines: reviewGuidelines as string,
			emailFooter: emailFooter as string,
		};
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
];

function AdminSettingsPage() {
	const {
		conferenceSettings,
		submissionTypes,
		submissionSettings,
		feeInstructions,
		brandingSettings,
		sessions,
		reviewers,
		reminderSettings,
		emailTemplates,
		submissionGuidelines,
		reviewGuidelines,
		emailFooter,
	} = Route.useLoaderData();
	const [activeTab, setActiveTab] = useState("conference");
	const router = useRouter();

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconSettings} title="Configuration" />
			<div className="flex-1 overflow-auto p-4 sm:p-8">
				<div className="mx-auto max-w-5xl">
					<Tabs value={activeTab} onValueChange={setActiveTab}>
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
								initialSubmissionGuidelines={submissionGuidelines}
								initialReviewGuidelines={reviewGuidelines}
							/>
						</TabsContent>

						<TabsContent value="types">
							<SubmissionTypesTab initialData={submissionTypes} />
						</TabsContent>

						<TabsContent value="sessions">
							<SessionsTab
								initialSessions={sessions}
								reviewers={reviewers}
								onUpdate={() => router.invalidate()}
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

						<TabsContent value="fee-instructions">
							<FeeInstructionsTab initialInstructions={feeInstructions} />
						</TabsContent>

						<TabsContent value="reminders">
							<RemindersSettingsTab initialData={reminderSettings} />
						</TabsContent>
					</Tabs>

					<div className="h-12" />
				</div>
			</div>
		</div>
	);
}
