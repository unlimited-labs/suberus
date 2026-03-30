import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

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
					htmlFor={id}
					className={cn(
						"text-sm cursor-pointer",
						disabled && "text-muted-foreground",
					)}
				>
					{label}
				</Label>
				<Switch
					id={id}
					checked={checked}
					onCheckedChange={onCheckedChange}
					disabled={disabled}
				/>
			</div>
			<p className="text-xs text-muted-foreground">{description}</p>
			{warning ? <p className="text-xs text-destructive">{warning}</p> : null}
			{footer}
		</div>
	);
}
