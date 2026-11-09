import { IconInfoCircle } from "@tabler/icons-react";
import { Alert, AlertDescription } from "@/shared/ui/alert";

export function PaidBillingNote({
	organizerEmail,
}: {
	organizerEmail: string;
}) {
	const organizer = "the conference organizer";
	return (
		<Alert className="mb-4" data-testid="paid-billing-note">
			<IconInfoCircle />
			<AlertDescription>
				<p>
					Your fee is paid. If an invoice has already been issued, please
					contact{" "}
					{organizerEmail ? (
						<a className="underline" href={`mailto:${organizerEmail}`}>
							{organizer}
						</a>
					) : (
						organizer
					)}
					.
				</p>
			</AlertDescription>
		</Alert>
	);
}
