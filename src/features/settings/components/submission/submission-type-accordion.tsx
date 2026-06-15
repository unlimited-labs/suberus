import { IconLoader2 } from "@tabler/icons-react";
import type {
	SubmissionTypeConfig,
	SubmissionTypeKey,
} from "@/features/settings/types";
import {
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/ui/accordion";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { TypeFeatureTogglesSection } from "./type-feature-toggles-section";
import { TypeFormatSection } from "./type-format-section";
import { TypeGeneralSection } from "./type-general-section";
import { TypeReviewSection } from "./type-review-section";
import { TypeScoringSection } from "./type-scoring-section";
import { useSubmissionTypeConfig } from "./use-submission-type-config";

interface SubmissionTypeAccordionProps {
	typeKey: SubmissionTypeKey;
	config: SubmissionTypeConfig;
	onChange: (updated: SubmissionTypeConfig) => void;
}

export function SubmissionTypeAccordion({
	typeKey,
	config,
	onChange,
}: SubmissionTypeAccordionProps) {
	const {
		isSaving,
		displayName,
		handleChange,
		toggleExtension,
		addCriterion,
		removeCriterion,
		updateCriterion,
		handleSave,
	} = useSubmissionTypeConfig({ typeKey, config, onChange });

	return (
		<AccordionItem
			value={typeKey}
			className="rounded-lg border border-border/50 bg-card px-4"
		>
			<AccordionTrigger className="py-4 hover:no-underline">
				<div className="flex items-center gap-3">
					<span className="font-medium">{displayName}</span>
					<Badge variant={config.isActive ? "default" : "secondary"}>
						{config.isActive ? "Active" : "Inactive"}
					</Badge>
					<Badge variant="outline" className="text-xs">
						{config.contentFormat}
					</Badge>
				</div>
			</AccordionTrigger>
			<AccordionContent className="pb-4">
				<div className="space-y-6">
					<TypeGeneralSection config={config} onChange={handleChange} />

					<TypeFormatSection
						config={config}
						onChange={handleChange}
						onToggleExtension={toggleExtension}
					/>

					<TypeReviewSection config={config} onChange={handleChange} />

					<TypeScoringSection
						config={config}
						onChange={handleChange}
						onUpdateCriterion={updateCriterion}
						onRemoveCriterion={removeCriterion}
						onAddCriterion={addCriterion}
					/>

					<TypeFeatureTogglesSection
						typeKey={typeKey}
						config={config}
						onChange={handleChange}
					/>

					{/* Save button */}
					<div className="flex justify-end border-t pt-4">
						<Button onClick={handleSave} disabled={isSaving}>
							{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
							Save
						</Button>
					</div>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
