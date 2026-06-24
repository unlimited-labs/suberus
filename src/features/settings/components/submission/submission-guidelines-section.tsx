import { IconBook } from "@tabler/icons-react";
import type { Dispatch, SetStateAction } from "react";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { Badge } from "@/shared/ui/badge";
import { MarkdownHint } from "@/shared/ui/markdown";
import { Textarea } from "@/shared/ui/textarea";

const submissionGuidelinesPlaceholders = [
	"minTitleLength",
	"maxTitleLength",
	"minAbstractLength",
	"maxAbstractLength",
	"minKeywords",
	"maxKeywords",
];

interface SubmissionGuidelinesSectionProps {
	value: string;
	onChange: Dispatch<SetStateAction<string>>;
}

export function SubmissionGuidelinesSection({
	value,
	onChange,
}: SubmissionGuidelinesSectionProps) {
	return (
		<SettingsSection
			icon={IconBook}
			title="Submission Guidelines"
			description="Markdown text shown to authors in the submission form sidebar. Use {{placeholder}} for dynamic values."
			delay={150}
		>
			<div className="space-y-3">
				<div className="flex flex-wrap gap-1.5">
					{submissionGuidelinesPlaceholders.map((p) => (
						<Badge
							key={p}
							variant="secondary"
							className="font-mono text-xs cursor-pointer"
							onClick={() => onChange((prev) => `${prev}{{${p}}}`)}
						>
							{`{{${p}}}`}
						</Badge>
					))}
				</div>
				<Textarea
					value={value}
					onChange={(e) => onChange(e.target.value)}
					rows={6}
					className="font-mono text-sm"
					placeholder="- Title should be concise..."
				/>
				<MarkdownHint />
			</div>
		</SettingsSection>
	);
}
