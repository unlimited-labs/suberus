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
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="fade-y max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
							disabled={isBusy}
							key={template.id}
							onClick={() => onImport(template.id)}
							template={template}
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
			className={cn(
				"flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left",
				"transition-all hover:border-primary hover:bg-primary/5",
				"disabled:pointer-events-none disabled:opacity-50",
			)}
			data-testid="template-card"
			disabled={disabled}
			onClick={onClick}
			type="button"
		>
			<div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
				<Icon className="size-5" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium">{template.name}</p>
				<p className="text-muted-foreground text-xs">{template.description}</p>
				<p className="text-muted-foreground mt-1 truncate text-xs">
					{template.questions.map((q) => q.label).join(" · ")}
				</p>
			</div>
		</button>
	);
}
