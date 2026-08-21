import { IconBook } from "@tabler/icons-react";
import type { Dispatch, SetStateAction } from "react";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { MarkdownHint } from "@/shared/ui/markdown";
import { Textarea } from "@/shared/ui/textarea";

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
				<Textarea
					className="font-mono text-sm"
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
