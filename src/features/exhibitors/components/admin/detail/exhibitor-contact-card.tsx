import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { InfoRow } from "./info-row";
import type { ExhibitorDetail } from "./types";

interface ExhibitorContactCardProps {
	user: ExhibitorDetail["user"];
}

export function ExhibitorContactCard({ user }: ExhibitorContactCardProps) {
	const contactName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

	return (
		<Card data-testid="exhibitor-contact">
			<CardHeader>
				<CardTitle>Contact</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
				<InfoRow label="Name">{contactName || "—"}</InfoRow>
				<InfoRow label="Email">{user.email}</InfoRow>
				<InfoRow label="Fee">
					{user.fee?.paid ? (
						<Badge
							variant="outline"
							className="border-green-600 text-green-600"
						>
							{user.fee.type ?? "Paid"}
						</Badge>
					) : (
						<Badge variant="destructive">Unpaid</Badge>
					)}
				</InfoRow>
			</CardContent>
		</Card>
	);
}
