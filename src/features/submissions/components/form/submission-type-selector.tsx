import {
	IconCategory,
	IconFile,
	IconFileText,
	IconSparkles,
} from "@tabler/icons-react";
import { cn } from "@/shared/lib/utils";
import type { ActiveSubmissionType } from "./submission-form-types";

type SubmissionType = "ABSTRACT" | "POSTER" | "FULL_PAPER";

const typeIcons = {
	ABSTRACT: IconFileText,
	POSTER: IconSparkles,
	FULL_PAPER: IconFile,
} as const;

interface SubmissionTypeSelectorProps {
	typeConfigs: ActiveSubmissionType[];
	selectedType: SubmissionType;
	onSelect: (type: SubmissionType) => void;
}

export function SubmissionTypeSelector({
	typeConfigs,
	selectedType,
	onSelect,
}: SubmissionTypeSelectorProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<IconCategory className="size-5 text-muted-foreground" />
				<h2 className="text-lg font-semibold text-foreground">
					Submission Type
				</h2>
			</div>
			<div
				className={cn(
					"grid gap-3",
					typeConfigs.length === 2 && "grid-cols-2",
					typeConfigs.length >= 3 && "grid-cols-2 sm:grid-cols-3",
				)}
			>
				{typeConfigs.map((option) => {
					const Icon = typeIcons[option.type];
					const isSelected = selectedType === option.type;
					return (
						<button
							key={option.type}
							type="button"
							onClick={() => onSelect(option.type)}
							className={cn(
								"flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border hover:border-primary/50",
							)}
						>
							<div
								className={cn(
									"flex-shrink-0 p-2 rounded-md",
									isSelected ? "bg-primary/10" : "bg-muted",
								)}
							>
								<Icon
									className={cn(
										"size-5",
										isSelected ? "text-primary" : "text-muted-foreground",
									)}
								/>
							</div>
							<span
								className={cn(
									"font-medium",
									isSelected ? "text-foreground" : "text-muted-foreground",
								)}
							>
								{option.label}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
