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
					<div className="flex items-start gap-2" key={rowIds[index]}>
						<div className="grid flex-1 gap-2 sm:grid-cols-2">
							<Input
								onChange={(e) => onUpdate(index, "name", e.target.value)}
								placeholder="Criterion name"
								value={criterion.name}
							/>
							<Input
								onChange={(e) => onUpdate(index, "description", e.target.value)}
								placeholder="Description (optional)"
								value={criterion.description}
							/>
						</div>
						<Button
							className="shrink-0 text-destructive hover:bg-destructive/10"
							onClick={() => handleRemove(index)}
							size="icon"
							type="button"
							variant="ghost"
						>
							<IconTrash className="size-4" />
						</Button>
					</div>
				))}
			</div>
			<Button
				className="gap-1"
				onClick={handleAdd}
				size="sm"
				type="button"
				variant="outline"
			>
				<IconPlus className="size-4" />
				Add criterion
			</Button>
		</div>
	);
}
