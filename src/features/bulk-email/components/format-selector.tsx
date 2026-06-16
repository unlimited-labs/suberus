import type { EmailCampaignFormat } from "@/generated/prisma/enums";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";

const OPTIONS: Array<{
	value: EmailCampaignFormat;
	label: string;
	hint: string;
}> = [
	{ value: "PLAIN", label: "Plain text", hint: "Sent as-is, no formatting" },
	{ value: "MARKDOWN", label: "Markdown", hint: "Rendered to HTML" },
	{ value: "MJML", label: "MJML", hint: "Email markup, compiled to HTML" },
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
		<RadioGroup
			value={value}
			onValueChange={(v) => onChange(v as EmailCampaignFormat)}
			disabled={disabled}
			className="flex flex-wrap gap-4"
			data-testid="format-selector"
		>
			{OPTIONS.map((opt) => (
				<div key={opt.value} className="flex items-center gap-2">
					<RadioGroupItem value={opt.value} id={`format-${opt.value}`} />
					<Label htmlFor={`format-${opt.value}`} className="font-normal">
						{opt.label}
						<span className="block text-xs text-muted-foreground">
							{opt.hint}
						</span>
					</Label>
				</div>
			))}
		</RadioGroup>
	);
}
