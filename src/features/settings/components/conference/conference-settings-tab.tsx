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
	const { data, isSaving, handleChange, handleToggle, handleSave } =
		useConferenceSettings(initialData);

	return (
		<div className="space-y-6">
			<BasicInformationSection
				data={data}
				onChange={handleChange}
				onSave={handleSave}
				isSaving={isSaving}
			/>

			<ImportantDatesSection
				data={data}
				onChange={handleChange}
				onToggle={handleToggle}
				onSave={handleSave}
				isSaving={isSaving}
			/>

			<DateTimeSection
				data={data}
				onChange={handleChange}
				onSave={handleSave}
				isSaving={isSaving}
			/>

			<ExhibitorsSettingsSection
				initialConfig={initialExhibitorConfig}
				delay={300}
			/>
		</div>
	);
}
