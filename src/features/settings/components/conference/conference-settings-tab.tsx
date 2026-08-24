import type { ConferenceSettings } from "@/features/settings/api/settings";
import type { SubmissionTypeConfig } from "@/features/settings/types";
import { BasicInformationSection } from "./basic-information-section";
import { DateTimeSection } from "./date-time-section";
import { ExhibitorsSettingsSection } from "./exhibitors-settings-section";
import { ImportantDatesSection } from "./important-dates-section";

interface ConferenceSettingsTabProps {
	initialData: ConferenceSettings;
	initialExhibitorConfig: SubmissionTypeConfig;
}

export function ConferenceSettingsTab({
	initialData,
	initialExhibitorConfig,
}: ConferenceSettingsTabProps) {
	return (
		<div className="space-y-6">
			<BasicInformationSection initialData={initialData} />

			<ImportantDatesSection initialData={initialData} />

			<DateTimeSection initialData={initialData} />

			<ExhibitorsSettingsSection
				delay={300}
				initialConfig={initialExhibitorConfig}
			/>
		</div>
	);
}
