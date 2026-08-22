import { IconLoader2 } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-store";
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
import { FieldError } from "@/shared/ui/field";
import { TypeFeatureTogglesSection } from "./type-feature-toggles-section";
import { TypeFormatSection } from "./type-format-section";
import { TypeGeneralSection } from "./type-general-section";
import { TypeReviewSection } from "./type-review-section";
import { TypeScoringSection } from "./type-scoring-section";
import { useSubmissionTypeConfig } from "./use-submission-type-config";

interface SubmissionTypeAccordionProps {
	typeKey: SubmissionTypeKey;
	config: SubmissionTypeConfig;
}

export function SubmissionTypeAccordion({
	typeKey,
	config,
}: SubmissionTypeAccordionProps) {
	const { form, displayName } = useSubmissionTypeConfig({ typeKey, config });
	const submissionAttempts = useSelector(
		form.store,
		(s) => s.submissionAttempts,
	);
	const isSaving = useSelector(form.store, (s) => s.isSubmitting);
	const isActive = useSelector(form.store, (s) => s.values.isActive);
	const contentFormat = useSelector(form.store, (s) => s.values.contentFormat);
	const formErrors = useSelector(form.store, (s) => s.errors);

	return (
		<AccordionItem
			className="border-border/50 bg-card rounded-lg border px-4"
			value={typeKey}
		>
			<AccordionTrigger className="py-4 hover:no-underline">
				<div className="flex items-center gap-3">
					<span className="font-medium">{displayName}</span>
					<Badge variant={isActive ? "default" : "secondary"}>
						{isActive ? "Active" : "Inactive"}
					</Badge>
					<Badge className="text-xs" variant="outline">
						{contentFormat}
					</Badge>
				</div>
			</AccordionTrigger>
			<AccordionContent className="pb-4">
				<div className="space-y-6">
					<TypeGeneralSection
						form={form}
						submissionAttempts={submissionAttempts}
						typeKey={typeKey}
					/>

					<TypeFormatSection
						form={form}
						submissionAttempts={submissionAttempts}
					/>

					<TypeReviewSection
						form={form}
						submissionAttempts={submissionAttempts}
					/>

					<TypeScoringSection form={form} />

					<TypeFeatureTogglesSection form={form} typeKey={typeKey} />

					<div className="flex items-center justify-end gap-4 border-t pt-4">
						<FieldError
							errors={submissionAttempts > 0 ? formErrors : undefined}
						/>
						<Button
							disabled={isSaving}
							onClick={() => void form.handleSubmit()}
						>
							{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
							Save
						</Button>
					</div>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}
