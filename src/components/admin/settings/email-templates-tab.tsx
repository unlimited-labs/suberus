import { IconMail } from "@tabler/icons-react";
import { useState } from "react";

import { SettingsSection } from "@/components/settings/settings-section";
import type { EmailEventType } from "@/generated/prisma/enums";
import { EmailTemplateCard } from "./email-template-card";
import { EmailTemplateDialog } from "./email-template-dialog";

/** UI shape for email templates (maps Prisma arrays to comma-separated strings) */
export interface EmailTemplateUI {
	id: string;
	eventType: EmailEventType;
	name: string;
	subject: string;
	body: string;
	cc: string;
	bcc: string;
	isEnabled: boolean;
	placeholders: string[];
}

/** Human-readable labels for EmailEventType */
const eventTypeLabels: Record<EmailEventType, string> = {
	SUBMISSION_RECEIVED: "Submission Received",
	SUBMISSION_WITHDRAWN: "Submission Withdrawn",
	REVIEWER_ASSIGNED: "Reviewer Assigned",
	REVIEWER_REMINDER: "Reviewer Reminder",
	REVIEW_SUBMITTED: "Review Submitted",
	ALL_REVIEWS_COMPLETE: "All Reviews Complete",
	DECISION_ACCEPTED: "Decision - Accepted",
	DECISION_CONDITIONALLY_ACCEPTED: "Decision - Conditionally Accepted",
	DECISION_REVISE_REQUIRED: "Decision - Revision Required",
	DECISION_REJECTED: "Decision - Rejected",
	REVISION_REMINDER: "Revision Reminder",
	REVISION_RECEIVED: "Revision Received",
	DEADLINE_APPROACHING: "Deadline Approaching",
	ACCOUNT_CREATED: "Account Created",
	PASSWORD_RESET: "Password Reset",
	EMAIL_VERIFICATION: "Email Verification",
};

/** Map Prisma EmailTemplate to UI shape */
export function toEmailTemplateUI(t: {
	id: string;
	eventType: EmailEventType;
	subject: string;
	body: string;
	ccEmails: string[];
	bccEmails: string[];
	isEnabled: boolean;
	availablePlaceholders: string[];
	description: string | null;
}): EmailTemplateUI {
	return {
		id: t.id,
		eventType: t.eventType,
		name: t.description ?? eventTypeLabels[t.eventType] ?? t.eventType,
		subject: t.subject,
		body: t.body,
		cc: t.ccEmails.join(", "),
		bcc: t.bccEmails.join(", "),
		isEnabled: t.isEnabled,
		placeholders: t.availablePlaceholders,
	};
}

interface EmailTemplatesTabProps {
	initialData: EmailTemplateUI[];
}

export function EmailTemplatesTab({ initialData }: EmailTemplatesTabProps) {
	const [templates, setTemplates] = useState(initialData);
	const [editingTemplate, setEditingTemplate] =
		useState<EmailTemplateUI | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const handleEdit = (template: EmailTemplateUI) => {
		setEditingTemplate(template);
		setDialogOpen(true);
	};

	const handleSave = (updated: EmailTemplateUI) => {
		setTemplates((prev) =>
			prev.map((t) => (t.eventType === updated.eventType ? updated : t)),
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
							key={template.eventType}
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
