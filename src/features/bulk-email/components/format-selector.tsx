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
			<Label htmlFor="format-select" className="text-muted-foreground">
				Format
			</Label>
			<Select
				items={OPTIONS}
				value={value}
				onValueChange={(v) => onChange(v as EmailCampaignFormat)}
				disabled={disabled}
			>
				<SelectTrigger
					id="format-select"
					data-testid="format-select"
					className="h-8 w-[150px]"
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
