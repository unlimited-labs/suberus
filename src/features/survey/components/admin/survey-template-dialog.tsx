import {
	SURVEY_TEMPLATES,
	type SurveyTemplate,
} from "@/features/survey/templates";
import { cn } from "@/shared/lib/utils";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";

interface SurveyTemplateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onImport: (templateId: string) => void;
	isBusy: boolean;
}

export function SurveyTemplateDialog({
	open,
	onOpenChange,
	onImport,
	isBusy,
}: SurveyTemplateDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Import template</DialogTitle>
					<DialogDescription>
						Add a predefined set of questions. You can edit or remove them
						afterwards.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					{SURVEY_TEMPLATES.map((template) => (
						<TemplateCard
							key={template.id}
							template={template}
							disabled={isBusy}
							onClick={() => onImport(template.id)}
						/>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}

function TemplateCard({
	template,
	disabled,
	onClick,
}: {
	template: SurveyTemplate;
	disabled: boolean;
	onClick: () => void;
}) {
	const Icon = template.icon;
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			data-testid="template-card"
			className={cn(
				"flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left",
				"transition-all hover:border-primary hover:bg-primary/5",
				"disabled:pointer-events-none disabled:opacity-50",
			)}
		>
			<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
				<Icon className="size-5" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium">{template.name}</p>
				<p className="text-xs text-muted-foreground">{template.description}</p>
				<p className="mt-1 truncate text-xs text-muted-foreground">
					{template.questions.map((q) => q.label).join(" · ")}
				</p>
			</div>
		</button>
	);
}
