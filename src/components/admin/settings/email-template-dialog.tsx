import { IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { EmailTemplate } from "@/lib/mock-data/admin-settings";

interface EmailTemplateDialogProps {
	template: EmailTemplate | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (template: EmailTemplate) => void;
}

export function EmailTemplateDialog({
	template,
	open,
	onOpenChange,
	onSave,
}: EmailTemplateDialogProps) {
	const [data, setData] = useState<EmailTemplate | null>(template);
	const [isSaving, setIsSaving] = useState(false);

	// Update local state when template changes
	if (template && data?.id !== template.id) {
		setData(template);
	}

	if (!data) return null;

	const handleChange = <K extends keyof EmailTemplate>(
		field: K,
		value: EmailTemplate[K],
	) => {
		setData((prev) => (prev ? { ...prev, [field]: value } : prev));
	};

	const handleSave = async () => {
		if (!data) return;
		setIsSaving(true);
		try {
			await new Promise((resolve) => setTimeout(resolve, 800));
			onSave(data);
			toast.success(`Template "${data.name}" saved`);
			onOpenChange(false);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit template: {data.name}</DialogTitle>
					<DialogDescription>
						Modify email template content and settings
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="flex items-center justify-between">
						<Label htmlFor="enabled">Active</Label>
						<Switch
							id="enabled"
							checked={data.enabled}
							onCheckedChange={(checked) => handleChange("enabled", checked)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="subject">Subject</Label>
						<Input
							id="subject"
							value={data.subject}
							onChange={(e) => handleChange("subject", e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="body">Body</Label>
						<Textarea
							id="body"
							value={data.body}
							onChange={(e) => handleChange("body", e.target.value)}
							className="min-h-48"
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="cc">CC</Label>
							<Input
								id="cc"
								value={data.cc}
								onChange={(e) => handleChange("cc", e.target.value)}
								placeholder="email@example.com"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="bcc">BCC</Label>
							<Input
								id="bcc"
								value={data.bcc}
								onChange={(e) => handleChange("bcc", e.target.value)}
								placeholder="email@example.com"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label>Available placeholders</Label>
						<div className="flex flex-wrap gap-1.5">
							{data.placeholders.map((placeholder) => (
								<Badge
									key={placeholder}
									variant="outline"
									className="cursor-pointer font-mono text-xs"
									onClick={() => {
										navigator.clipboard.writeText(placeholder);
										toast.success("Copied to clipboard");
									}}
								>
									{placeholder}
								</Badge>
							))}
						</div>
						<p className="text-xs text-muted-foreground">Click to copy</p>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isSaving}
					>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
