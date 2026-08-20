import { toast } from "sonner";
import { Badge } from "@/shared/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { PLACEHOLDER_KEYS } from "../lib/placeholders";

const DESCRIPTIONS = {
	firstName: "Recipient's first name",
	lastName: "Recipient's last name",
	title: "Recipient's submission titles (comma-separated)",
} satisfies Record<(typeof PLACEHOLDER_KEYS)[number], string>;

/** Clickable placeholder chips — click copies the `{{token}}` to the clipboard. */
export function PlaceholderHelp() {
	return (
		<div className="space-y-2" data-testid="placeholder-help">
			<div className="flex flex-wrap gap-1.5">
				{PLACEHOLDER_KEYS.map((key) => {
					const token = `{{${key}}}`;
					return (
						<Tooltip key={key}>
							<TooltipTrigger asChild>
								<Badge
									variant="outline"
									className="cursor-pointer font-mono text-xs hover:bg-muted"
									data-testid={`placeholder-${key}`}
									onClick={() => {
										navigator.clipboard.writeText(token);
										toast.success("Copied to clipboard");
									}}
								>
									{token}
								</Badge>
							</TooltipTrigger>
							<TooltipContent>{DESCRIPTIONS[key]}</TooltipContent>
						</Tooltip>
					);
				})}
			</div>
			<p className="text-xs text-muted-foreground">
				Click to copy · hover for description
			</p>
		</div>
	);
}
