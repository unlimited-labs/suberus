import { IconEdit, IconMail, IconMailOff } from "@tabler/icons-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import type { EmailTemplateUI } from "./email-templates-tab";

interface EmailTemplateCardProps {
	template: EmailTemplateUI;
	onEdit: () => void;
}

export function EmailTemplateCard({
	template,
	onEdit,
}: EmailTemplateCardProps) {
	return (
		<div
			className="border-border/50 bg-card hover:bg-muted/30 flex items-center justify-between rounded-lg border p-4 transition-colors"
			data-testid="email-template-card"
		>
			<div className="flex items-center gap-3">
				<div
					className={`flex size-10 items-center justify-center rounded-lg ${
						template.isEnabled ? "bg-primary/10" : "bg-muted"
					}`}
				>
					{template.isEnabled ? (
						<IconMail className="text-primary size-5" />
					) : (
						<IconMailOff className="text-muted-foreground size-5" />
					)}
				</div>
				<div>
					<div className="flex items-center gap-2">
						<span className="font-medium">{template.name}</span>
						<Badge variant={template.isEnabled ? "default" : "secondary"}>
							{template.isEnabled ? "Active" : "Disabled"}
						</Badge>
					</div>
					<p className="text-muted-foreground text-sm">{template.subject}</p>
				</div>
			</div>
			<Button onClick={onEdit} size="icon" variant="ghost">
				<IconEdit className="size-4" />
			</Button>
		</div>
	);
}
