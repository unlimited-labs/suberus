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
		<div className="rounded-lg border border-border/50 p-3 space-y-2">
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
			<p className="text-xs text-muted-foreground">{description}</p>
			{warning ? <p className="text-xs text-destructive">{warning}</p> : null}
			{footer}
		</div>
	);
}
