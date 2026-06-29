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
			className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-4 transition-colors hover:bg-muted/30"
			data-testid="email-template-card"
		>
			<div className="flex items-center gap-3">
				<div
					className={`flex size-10 items-center justify-center rounded-lg ${
						template.isEnabled ? "bg-primary/10" : "bg-muted"
					}`}
				>
					{template.isEnabled ? (
						<IconMail className="size-5 text-primary" />
					) : (
						<IconMailOff className="size-5 text-muted-foreground" />
					)}
				</div>
				<div>
					<div className="flex items-center gap-2">
						<span className="font-medium">{template.name}</span>
						<Badge variant={template.isEnabled ? "default" : "secondary"}>
							{template.isEnabled ? "Active" : "Disabled"}
						</Badge>
					</div>
					<p className="text-sm text-muted-foreground">{template.subject}</p>
				</div>
			</div>
			<Button variant="ghost" size="icon" onClick={onEdit}>
				<IconEdit className="size-4" />
			</Button>
		</div>
	);
}
