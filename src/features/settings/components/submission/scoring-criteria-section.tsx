import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import type { SubmissionTypeConfig } from "@/features/settings/types";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface ScoringCriteriaSectionProps {
	criteria: SubmissionTypeConfig["scoringCriteria"];
	onUpdate: (
		index: number,
		field: "name" | "description",
		value: string,
	) => void;
	onRemove: (index: number) => void;
	onAdd: () => void;
}

export function ScoringCriteriaSection({
	criteria,
	onUpdate,
	onRemove,
	onAdd,
}: ScoringCriteriaSectionProps) {
	const [rowIds, setRowIds] = useState(() =>
		criteria.map(() => crypto.randomUUID()),
	);

	const handleRemove = (index: number) => {
		setRowIds((prev) => prev.filter((_, i) => i !== index));
		onRemove(index);
	};

	const handleAdd = () => {
		setRowIds((prev) => [...prev, crypto.randomUUID()]);
		onAdd();
	};

	return (
		<div className="space-y-3 pl-0 sm:pl-4">
			<Label>Scoring criteria</Label>
			<div className="space-y-2">
				{criteria.map((criterion, index) => (
					<div key={rowIds[index]} className="flex items-start gap-2">
						<div className="grid flex-1 gap-2 sm:grid-cols-2">
							<Input
								placeholder="Criterion name"
								value={criterion.name}
								onChange={(e) => onUpdate(index, "name", e.target.value)}
							/>
							<Input
								placeholder="Description (optional)"
								value={criterion.description}
								onChange={(e) => onUpdate(index, "description", e.target.value)}
							/>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="shrink-0 text-destructive hover:bg-destructive/10"
							onClick={() => handleRemove(index)}
						>
							<IconTrash className="size-4" />
						</Button>
					</div>
				))}
			</div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={handleAdd}
				className="gap-1"
			>
				<IconPlus className="size-4" />
				Add criterion
			</Button>
		</div>
	);
}
