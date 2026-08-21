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
		<div className="flex items-center gap-2">
			<Label className="text-muted-foreground" htmlFor="format-select">
				Format
			</Label>
			<Select
				disabled={disabled}
				items={OPTIONS}
				// SAFETY: the select renders only EmailCampaignFormat options.
				onValueChange={(v) => onChange(v as EmailCampaignFormat)}
				value={value}
			>
				<SelectTrigger
					className="h-8 w-[150px]"
					data-testid="format-select"
					id="format-select"
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
