import { PLACEHOLDER_KEYS } from "../lib/placeholders";

const DESCRIPTIONS: Record<(typeof PLACEHOLDER_KEYS)[number], string> = {
	firstName: "Recipient's first name",
	lastName: "Recipient's last name",
	title: "Recipient's submission titles (comma-separated)",
};

/** Lists the placeholders an admin can drop into the subject or body. */
export function PlaceholderHelp() {
	return (
		<div className="space-y-1 text-sm" data-testid="placeholder-help">
			<p className="font-medium">Placeholders</p>
			<ul className="space-y-0.5 text-muted-foreground">
				{PLACEHOLDER_KEYS.map((key) => (
					<li key={key}>
						<code className="rounded bg-muted px-1 py-0.5 text-xs">{`{{${key}}}`}</code>{" "}
						— {DESCRIPTIONS[key]}
					</li>
				))}
			</ul>
		</div>
	);
}
