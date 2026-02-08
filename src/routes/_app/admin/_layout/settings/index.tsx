import {
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
import {
	BrandingSettingsTab,
	ConferenceSettingsTab,
	EmailTemplatesTab,
	FeeInstructionsTab,
	SubmissionSettingsTab,
	SubmissionTypesTab,
} from "@/components/admin/settings";
import { SessionsTab } from "@/components/admin/sessions/sessions-tab";
import {
	getAllSessionsFn,
	getReviewerUsersFn,
} from "@/utils/sessions.functions";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { defaultEmailTemplates } from "@/lib/mock-data/admin-settings";
import { getPaymentInstructionsFn } from "@/utils/fee.functions";
import {
	getBrandingSettingsFn,
	getConferenceSettingsFn,
	getSubmissionTypeConfigsFn,
	getSubmissionValidationSettingsFn,
} from "@/utils/settings.functions";

export const Route = createFileRoute("/_app/admin/_layout/settings/")({
	loader: async () => {
		const [conferenceSettings, submissionTypes, submissionSettings, feeInstructions, brandingSettings, sessions, reviewers] =
			await Promise.all([
				getConferenceSettingsFn(),
				getSubmissionTypeConfigsFn(),
				getSubmissionValidationSettingsFn(),
				getPaymentInstructionsFn(),
				getBrandingSettingsFn(),
				getAllSessionsFn(),
				getReviewerUsersFn(),
			]);
		return { conferenceSettings, submissionTypes, submissionSettings, feeInstructions, brandingSettings, sessions, reviewers };
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
];

function AdminSettingsPage() {
	const { conferenceSettings, submissionTypes, submissionSettings, feeInstructions, brandingSettings, sessions, reviewers } =
		Route.useLoaderData();
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
							<SubmissionSettingsTab initialData={submissionSettings} />
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
							<EmailTemplatesTab initialData={defaultEmailTemplates} />
						</TabsContent>

						<TabsContent value="branding">
							<BrandingSettingsTab initialData={brandingSettings} />
						</TabsContent>

						<TabsContent value="fee-instructions">
							<FeeInstructionsTab initialInstructions={feeInstructions} />
						</TabsContent>
					</Tabs>

					<div className="h-12" />
				</div>
			</div>
		</div>
	);
}
