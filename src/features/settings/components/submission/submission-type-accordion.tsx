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
		selectExtension,
		addCriterion,
		removeCriterion,
		updateCriterion,
		handleSave,
	} = useSubmissionTypeConfig({ typeKey, config, onChange });

	return (
		<AccordionItem
			className="border-border/50 bg-card rounded-lg border px-4"
			value={typeKey}
		>
			<AccordionTrigger className="py-4 hover:no-underline">
				<div className="flex items-center gap-3">
					<span className="font-medium">{displayName}</span>
					<Badge variant={config.isActive ? "default" : "secondary"}>
						{config.isActive ? "Active" : "Inactive"}
					</Badge>
					<Badge className="text-xs" variant="outline">
						{config.contentFormat}
					</Badge>
				</div>
			</AccordionTrigger>
			<AccordionContent className="pb-4">
				<div className="space-y-6">
					<TypeGeneralSection
						config={config}
						onChange={handleChange}
						typeKey={typeKey}
					/>

					<TypeFormatSection
						config={config}
						onChange={handleChange}
						onSelectExtension={selectExtension}
					/>

					<TypeReviewSection config={config} onChange={handleChange} />

					<TypeScoringSection
						config={config}
						onAddCriterion={addCriterion}
						onChange={handleChange}
						onRemoveCriterion={removeCriterion}
						onUpdateCriterion={updateCriterion}
					/>

					<TypeFeatureTogglesSection
						config={config}
						onChange={handleChange}
						typeKey={typeKey}
					/>

					{/* Save button */}
					<div className="flex justify-end border-t pt-4">
						<Button disabled={isSaving} onClick={handleSave}>
							{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
							Save
						</Button>
					</div>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
