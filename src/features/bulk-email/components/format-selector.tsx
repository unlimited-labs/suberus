import type { EmailCampaignFormat } from "@/generated/prisma/enums";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

const OPTIONS: Array<{ value: EmailCampaignFormat; label: string }> = [
	{ value: "PLAIN", label: "Plain text" },
	{ value: "MARKDOWN", label: "Markdown" },
	{ value: "MJML", label: "MJML" },
];

interface FormatSelectorProps {
	value: EmailCampaignFormat;
	onChange: (value: EmailCampaignFormat) => void;
	disabled?: boolean;
}

export function FormatSelector({
	value,
	onChange,
	disabled,
}: FormatSelectorProps) {
	return (
		<div className="space-y-2">
			<Label htmlFor="format-select">Format</Label>
			<Select
				value={value}
				onValueChange={(v) => onChange(v as EmailCampaignFormat)}
				disabled={disabled}
			>
				<SelectTrigger
					id="format-select"
					data-testid="format-select"
					className="w-[220px]"
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{OPTIONS.map((opt) => (
						<SelectItem key={opt.value} value={opt.value}>
							{opt.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
