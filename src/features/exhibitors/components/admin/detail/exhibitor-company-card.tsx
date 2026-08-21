import { useState } from "react";
import { toast } from "sonner";
import { setExhibitorPackageFn } from "@/features/exhibitors/api/exhibitors";
import { exhibitorStatusBadge } from "@/features/exhibitors/labels";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { SectionCard } from "@/shared/ui/section-card";
import { InfoRow, notProvided } from "./info-row";
import type { ExhibitorDetail } from "./types";

/** Package is declared by the organizer (what was agreed), editable in any status */
function PackageEditor({
	exhibitorId,
	currentPackage,
	onSaved,
}: {
	exhibitorId: string;
	currentPackage: string | null;
	onSaved: () => void;
}) {
	const [value, setValue] = useState(currentPackage ?? "");
	const [isSaving, setIsSaving] = useState(false);
	const isUnchanged = value.trim() === (currentPackage ?? "");

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await setExhibitorPackageFn({
				data: { id: exhibitorId, package: value.trim() || null },
			});
			toast.success("Package saved");
			onSaved();
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save package"));
		}
		setIsSaving(false);
	};

	return (
		<span className="flex w-full max-w-sm items-center gap-2">
			<Input
				data-testid="exhibitor-package-input"
				maxLength={200}
				onChange={(e) => setValue(e.target.value)}
				value={value}
			/>
			<Button
				data-testid="exhibitor-package-save"
				disabled={isUnchanged || isSaving}
				onClick={handleSave}
				size="sm"
				variant="outline"
			>
				{isSaving ? "Saving..." : "Save"}
			</Button>
		</span>
	);
}

interface ExhibitorCompanyCardProps {
	exhibitor: ExhibitorDetail;
	onPackageSaved: () => void;
}

export function ExhibitorCompanyCard({
	exhibitor,
	onPackageSaved,
}: ExhibitorCompanyCardProps) {
	const { formatDate } = useDateFormat();
	const badge = exhibitorStatusBadge(exhibitor.status, exhibitor.appliedAt);

	return (
		<div data-testid="exhibitor-company">
			<SectionCard
				action={<Badge variant={badge.variant}>{badge.label}</Badge>}
				contentClassName="space-y-3 text-sm"
				title="Company"
			>
				<InfoRow label="Name">{exhibitor.companyName || notProvided}</InfoRow>
				<InfoRow label="Website">
					{exhibitor.website ? (
						<a
							className="text-primary underline-offset-4 hover:underline"
							href={exhibitor.website}
							rel="noopener noreferrer"
							target="_blank"
						>
							{exhibitor.website}
						</a>
					) : (
						notProvided
					)}
				</InfoRow>
				<InfoRow label="Package">
					<PackageEditor
						currentPackage={exhibitor.package}
						exhibitorId={exhibitor.id}
						onSaved={onPackageSaved}
					/>
				</InfoRow>
				<InfoRow label="Description">
					{exhibitor.description ? (
						<span className="whitespace-pre-wrap">{exhibitor.description}</span>
					) : (
						notProvided
					)}
				</InfoRow>
				<InfoRow label="Applied">
					{exhibitor.appliedAt ? (
						formatDate(new Date(exhibitor.appliedAt))
					) : (
						<span className="text-muted-foreground">Not applied yet</span>
					)}
				</InfoRow>
			</SectionCard>
		</div>
	);
}
