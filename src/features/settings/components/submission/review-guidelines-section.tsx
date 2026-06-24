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
			icon={IconBook}
			title="Review Guidelines"
			description="Markdown text shown to reviewers in the review form sidebar"
			delay={200}
		>
			<div className="space-y-3">
				<Textarea
					value={value}
					onChange={(e) => onChange(e.target.value)}
					rows={6}
					className="font-mono text-sm"
					placeholder="- Provide constructive feedback..."
				/>
				<MarkdownHint />
			</div>
		</SettingsSection>
	);
}
