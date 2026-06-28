import { NoTemplatesHint } from "@/features/documents/components/document-bits";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

interface TemplateStepProps {
	templates: { id: string; name: string }[];
	templateId: string | null;
	onSelect: (id: string) => void;
}

export function TemplateStep({
	templates,
	templateId,
	onSelect,
}: TemplateStepProps) {
	return (
		<div className="space-y-2 py-2">
			<Label>Template</Label>
			<Select value={templateId ?? ""} onValueChange={onSelect}>
				<SelectTrigger data-testid="bulk-template-select">
					<SelectValue placeholder="Select a template…" />
				</SelectTrigger>
				<SelectContent>
					{templates.map((t) => (
						<SelectItem key={t.id} value={t.id}>
							{t.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{templates.length === 0 && <NoTemplatesHint />}
		</div>
	);
}
