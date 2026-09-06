import { toast } from "sonner";
import { lookup } from "@/shared/lib/lookup";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { BUILTIN_PLACEHOLDER_KEYS } from "../lib/placeholders";
import type { PlaceholderIssues } from "../validations";

const DESCRIPTIONS = {
	firstName: "Recipient's first name",
	lastName: "Recipient's last name",
	title: "Recipient's submission titles (comma-separated)",
} satisfies Record<(typeof BUILTIN_PLACEHOLDER_KEYS)[number], string>;

// ponytail: same-length near-match only; a real edit distance if typos get worse.
function closestKey(token: string, keys: string[]): string | null {
	const near = keys.find(
		(key) =>
			key.length === token.length &&
			[...key].filter((c, i) => c !== token[i]).length <= 2,
	);
	return near ?? null;
}

interface PlaceholderHelpProps {
	dataKeys: string[];
	issues: PlaceholderIssues | null;
}

export function PlaceholderHelp({ dataKeys, issues }: PlaceholderHelpProps) {
	const known = [...BUILTIN_PLACEHOLDER_KEYS, ...dataKeys];

	return (
		<div className="space-y-2" data-testid="placeholder-help">
			<div className="flex flex-wrap gap-1.5">
				{known.map((key) => {
					const token = `{{${key}}}`;
					const description =
						lookup(DESCRIPTIONS, key) ?? "From the imported spreadsheet";
					return (
						<Tooltip key={key}>
							<TooltipTrigger asChild>
								<Badge
									className="hover:bg-muted cursor-pointer font-mono text-xs"
									data-testid={`placeholder-${key}`}
									onClick={() => {
										navigator.clipboard.writeText(token);
										toast.success("Copied to clipboard");
									}}
									variant="outline"
								>
									{token}
								</Badge>
							</TooltipTrigger>
							<TooltipContent>{description}</TooltipContent>
						</Tooltip>
					);
				})}
			</div>
			<p className="text-muted-foreground text-xs">
				Click to copy · hover for description
			</p>

			{issues && issues.unknown.length > 0 && (
				<Alert data-testid="placeholder-unknown" variant="destructive">
					<AlertTitle>
						{issues.unknown.map((t) => `{{${t}}}`).join(", ")}
						{issues.unknown.length === 1
							? " is not a placeholder"
							: " are not placeholders"}
					</AlertTitle>
					<AlertDescription>
						{issues.unknown
							.map((token) => {
								const near = closestKey(token, known);
								return near ? `Did you mean {{${near}}}?` : null;
							})
							.filter(Boolean)
							.join(" ") || "Fix the message before sending."}
					</AlertDescription>
				</Alert>
			)}

			{issues && issues.missing.length > 0 && (
				<div
					className="rounded-md border border-amber-200 bg-amber-50/60 p-2 text-xs dark:border-amber-900/40 dark:bg-amber-950/20"
					data-testid="placeholder-missing"
				>
					{issues.missing.map((m) => (
						<p key={m.key}>
							<span className="font-mono">{`{{${m.key}}}`}</span> is empty for{" "}
							{m.count} recipient{m.count === 1 ? "" : "s"}:{" "}
							{m.sample.join(", ")}
						</p>
					))}
				</div>
			)}
		</div>
	);
}
