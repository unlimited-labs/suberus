import {
	IconCalendar,
	IconClock,
	IconMailCheck,
	IconMailX,
} from "@tabler/icons-react";
import type { AdminUserDetail } from "@/features/users/server/users";
import { Button } from "@/shared/ui/button";

interface UserAccountSectionProps {
	user: AdminUserDetail;
	fmtDate: (date: Date | null) => string;
	isPending: boolean;
	onVerifyEmail: () => void;
}

export function UserAccountSection({
	user,
	fmtDate,
	isPending,
	onVerifyEmail,
}: UserAccountSectionProps) {
	return (
		<div className="grid gap-3 sm:grid-cols-2">
			<div className="flex items-center gap-2">
				<IconCalendar className="size-4 text-muted-foreground" />
				<span>Created: {fmtDate(user.createdAt)}</span>
			</div>
			<div className="flex items-center gap-2">
				<IconClock className="size-4 text-muted-foreground" />
				<span>Last login: {fmtDate(user.lastLoginAt)}</span>
			</div>
			<div className="flex items-center gap-2">
				{user.emailVerified ? (
					<>
						<IconMailCheck className="size-4 text-green-600" />
						<span className="text-green-600">Email verified</span>
					</>
				) : (
					<>
						<IconMailX className="size-4 text-yellow-600" />
						<span className="text-yellow-600">Email not verified</span>
						<Button
							className="ml-2 h-7"
							disabled={isPending}
							onClick={onVerifyEmail}
							size="sm"
							variant="outline"
						>
							Verify
						</Button>
					</>
				)}
			</div>
		</div>
	);
}
