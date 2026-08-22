import type { ConferenceSettings } from "@/features/settings/api/settings";
import type { SubmissionTypeConfig } from "@/features/settings/types";
import { BasicInformationSection } from "./basic-information-section";
import { DateTimeSection } from "./date-time-section";
import { ExhibitorsSettingsSection } from "./exhibitors-settings-section";
import { ImportantDatesSection } from "./important-dates-section";
import { useConferenceSettings } from "./use-conference-settings";

interface ConferenceSettingsTabProps {
	initialData: ConferenceSettings;
	initialExhibitorConfig: SubmissionTypeConfig;
}

export function ConferenceSettingsTab({
	initialData,
	initialExhibitorConfig,
}: ConferenceSettingsTabProps) {
	const { form } = useConferenceSettings(initialData);

	return (
		<div className="space-y-6">
			<BasicInformationSection form={form} />

			<ImportantDatesSection form={form} />

			<DateTimeSection form={form} />

			<ExhibitorsSettingsSection
				delay={300}
				initialConfig={initialExhibitorConfig}
			/>
		</div>
	);
}
