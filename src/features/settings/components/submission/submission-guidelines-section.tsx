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
			delay={150}
			description="Markdown text shown to authors in the submission form sidebar. Use {{placeholder}} for dynamic values."
			icon={IconBook}
			title="Submission Guidelines"
		>
			<div className="space-y-3">
				<div className="flex flex-wrap gap-1.5">
					{submissionGuidelinesPlaceholders.map((p) => (
						<Badge
							className="cursor-pointer font-mono text-xs"
							key={p}
							onClick={() => onChange((prev) => `${prev}{{${p}}}`)}
							variant="secondary"
						>
							{`{{${p}}}`}
						</Badge>
					))}
				</div>
				<Textarea
					className="font-mono text-sm"
					onChange={(e) => onChange(e.target.value)}
					placeholder="- Title should be concise..."
					rows={6}
					value={value}
				/>
				<MarkdownHint />
			</div>
		</SettingsSection>
	);
}
