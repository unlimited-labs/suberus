import { IconFileStack } from "@tabler/icons-react";
import { useState } from "react";
import { SettingsSection } from "@/features/settings/components/settings-section";
import type {
	SubmissionTypeConfig,
	SubmissionTypeKey,
} from "@/features/settings/types";
import { SUBMISSION_TYPE_KEYS } from "@/features/settings/types";
import { Accordion } from "@/shared/ui/accordion";
import { SubmissionTypeAccordion } from "./submission-type-accordion";

interface SubmissionTypesTabProps {
	initialData: {
		ORAL_PRESENTATION: SubmissionTypeConfig;
		POSTER: SubmissionTypeConfig;
		FULL_PAPER: SubmissionTypeConfig;
		EXHIBITOR: SubmissionTypeConfig;
	};
}

export function SubmissionTypesTab({ initialData }: SubmissionTypesTabProps) {
	const [configs, setConfigs] = useState({
		SUBMISSION_TYPE_ORAL_PRESENTATION: initialData.ORAL_PRESENTATION,
		SUBMISSION_TYPE_POSTER: initialData.POSTER,
		SUBMISSION_TYPE_FULL_PAPER: initialData.FULL_PAPER,
		SUBMISSION_TYPE_EXHIBITOR: initialData.EXHIBITOR,
	});

	const handleConfigChange = (
		key: SubmissionTypeKey,
		updated: SubmissionTypeConfig,
	) => {
		setConfigs((prev) => ({ ...prev, [key]: updated }));
	};

	return (
		<SettingsSection
			description="Configure individual submission types"
			icon={IconFileStack}
			title="Submission Types"
		>
			<Accordion className="space-y-3">
				{SUBMISSION_TYPE_KEYS.filter(
					(key) => key !== "SUBMISSION_TYPE_EXHIBITOR",
				).map((key) => (
					<SubmissionTypeAccordion
						config={configs[key]}
						key={key}
						onChange={(updated) => handleConfigChange(key, updated)}
						typeKey={key}
					/>
				))}
			</Accordion>
		</SettingsSection>
	);
}
