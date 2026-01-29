import { IconEdit, IconMail, IconMailOff } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EmailTemplate } from "@/lib/mock-data/admin-settings";

interface EmailTemplateCardProps {
	template: EmailTemplate;
	onEdit: () => void;
}

export function EmailTemplateCard({
	template,
	onEdit,
}: EmailTemplateCardProps) {
	return (
		<div className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-4 transition-colors hover:bg-muted/30">
			<div className="flex items-center gap-3">
				<div
					className={`flex size-10 items-center justify-center rounded-lg ${
						template.enabled ? "bg-primary/10" : "bg-muted"
					}`}
				>
					{template.enabled ? (
						<IconMail className="size-5 text-primary" />
					) : (
						<IconMailOff className="size-5 text-muted-foreground" />
					)}
				</div>
				<div>
					<div className="flex items-center gap-2">
						<span className="font-medium">{template.name}</span>
						<Badge variant={template.enabled ? "default" : "secondary"}>
							{template.enabled ? "Active" : "Disabled"}
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
