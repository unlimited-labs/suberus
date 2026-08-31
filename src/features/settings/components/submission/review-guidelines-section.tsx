import { IconBook } from "@tabler/icons-react";
import type { Dispatch, SetStateAction } from "react";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { CodeArea } from "@/shared/ui/code-area";
import { MarkdownHint } from "@/shared/ui/markdown";

interface ReviewGuidelinesSectionProps {
	value: string;
	onChange: Dispatch<SetStateAction<string>>;
}

export function ReviewGuidelinesSection({
	value,
	onChange,
}: ReviewGuidelinesSectionProps) {
	return (
		<SettingsSection
			delay={200}
			description="Markdown text shown to reviewers in the review form sidebar"
			icon={IconBook}
			title="Review Guidelines"
		>
			<div className="space-y-3">
				<CodeArea
					className="font-mono text-sm"
					lang="markdown"
					onChange={(e) => onChange(e.target.value)}
					placeholder="- Provide constructive feedback..."
					rows={6}
					value={value}
				/>
				<MarkdownHint />
			</div>
		</SettingsSection>
	);
}
