import {
	IconBuilding,
	IconFileStack,
	IconFileText,
	IconMail,
	IconPalette,
	IconSettings,
} from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	BrandingSettingsTab,
	ConferenceSettingsTab,
	EmailTemplatesTab,
	SubmissionSettingsTab,
	SubmissionTypesTab,
} from "@/components/admin/settings";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	defaultBrandingSettings,
	defaultConferenceSettings,
	defaultEmailTemplates,
} from "@/lib/mock-data/admin-settings";
import {
	getSubmissionTypeConfigsFn,
	getSubmissionValidationSettingsFn,
} from "@/utils/settings.functions";

export const Route = createFileRoute("/_app/admin/_layout/settings/")({
	loader: async () => {
		const [submissionTypes, submissionSettings] = await Promise.all([
			getSubmissionTypeConfigsFn(),
			getSubmissionValidationSettingsFn(),
		]);
		return { submissionTypes, submissionSettings };
	},
	component: AdminSettingsPage,
});

const tabs = [
	{ id: "conference", label: "Conference", icon: IconBuilding },
	{ id: "submissions", label: "Submissions", icon: IconFileText },
	{ id: "types", label: "Submission Types", icon: IconFileStack },
	{ id: "emails", label: "Email Templates", icon: IconMail },
	{ id: "branding", label: "Branding", icon: IconPalette },
];

function AdminSettingsPage() {
	const { submissionTypes, submissionSettings } = Route.useLoaderData();
	const [activeTab, setActiveTab] = useState("conference");

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
							<ConferenceSettingsTab initialData={defaultConferenceSettings} />
						</TabsContent>

						<TabsContent value="submissions">
							<SubmissionSettingsTab initialData={submissionSettings} />
						</TabsContent>

						<TabsContent value="types">
							<SubmissionTypesTab initialData={submissionTypes} />
						</TabsContent>

						<TabsContent value="emails">
							<EmailTemplatesTab initialData={defaultEmailTemplates} />
						</TabsContent>

						<TabsContent value="branding">
							<BrandingSettingsTab initialData={defaultBrandingSettings} />
						</TabsContent>
					</Tabs>

					<div className="h-12" />
				</div>
			</div>
		</div>
	);
}
