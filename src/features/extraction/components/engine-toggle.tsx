import { cn } from "@/shared/lib/utils";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";

interface EngineToggleProps {
	id: string;
	label: string;
	description: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	disabled?: boolean;
	warning?: string;
	footer?: React.ReactNode;
}

export function EngineToggle({
	id,
	label,
	description,
	checked,
	onCheckedChange,
	disabled,
	warning,
	footer,
}: EngineToggleProps) {
	return (
		<div className="border-border/50 space-y-2 rounded-lg border p-3">
			<div className="flex items-center justify-between">
				<Label
					className={cn(
						"text-sm cursor-pointer",
						disabled && "text-muted-foreground",
					)}
					htmlFor={id}
				>
					{label}
				</Label>
				<Switch
					checked={checked}
					disabled={disabled}
					id={id}
					onCheckedChange={onCheckedChange}
				/>
			</div>
			<p className="text-muted-foreground text-xs">{description}</p>
			{warning ? <p className="text-destructive text-xs">{warning}</p> : null}
			{footer}
		</div>
	);
}
