import { IconMail } from "@tabler/icons-react";
import { useState } from "react";

import { SettingsSection } from "@/components/settings/settings-section";
import type { EmailTemplate } from "@/lib/mock-data/admin-settings";
import { EmailTemplateCard } from "./email-template-card";
import { EmailTemplateDialog } from "./email-template-dialog";

interface EmailTemplatesTabProps {
	initialData: EmailTemplate[];
}

export function EmailTemplatesTab({ initialData }: EmailTemplatesTabProps) {
	const [templates, setTemplates] = useState(initialData);
	const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(
		null,
	);
	const [dialogOpen, setDialogOpen] = useState(false);

	const handleEdit = (template: EmailTemplate) => {
		setEditingTemplate(template);
		setDialogOpen(true);
	};

	const handleSave = (updated: EmailTemplate) => {
		setTemplates((prev) =>
			prev.map((t) => (t.id === updated.id ? updated : t)),
		);
	};

	return (
		<>
			<SettingsSection
				icon={IconMail}
				title="Email Templates"
				description="Manage email notification templates"
			>
				<div className="space-y-3">
					{templates.map((template) => (
						<EmailTemplateCard
							key={template.id}
							template={template}
							onEdit={() => handleEdit(template)}
						/>
					))}
				</div>
			</SettingsSection>

			<EmailTemplateDialog
				template={editingTemplate}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSave={handleSave}
			/>
		</>
	);
}
