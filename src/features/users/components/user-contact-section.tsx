import {
	IconBuilding,
	IconId,
	IconMail,
	IconMapPin,
	IconWorld,
} from "@tabler/icons-react";
import type { AdminUserDetail } from "@/features/users/server/users";

interface UserContactSectionProps {
	user: AdminUserDetail;
}

export function UserContactSection({ user }: UserContactSectionProps) {
	return (
		<div className="grid gap-3 sm:grid-cols-2">
			<div className="flex items-center gap-2">
				<IconMail className="text-muted-foreground size-4" />
				<a
					className="text-primary hover:underline"
					href={`mailto:${user.email}`}
				>
					{user.email}
				</a>
			</div>
			{user.affiliation && (
				<div className="flex items-center gap-2">
					<IconBuilding className="text-muted-foreground size-4" />
					<span>{user.affiliation}</span>
				</div>
			)}
			{user.orcid && (
				<div className="flex items-center gap-2">
					<IconId className="text-muted-foreground size-4" />
					<span>ORCID: {user.orcid}</span>
				</div>
			)}
			{user.country && (
				<div className="flex items-center gap-2">
					<IconWorld className="text-muted-foreground size-4" />
					<span>{user.country}</span>
				</div>
			)}
			{user.address && (
				<div className="flex items-start gap-2 sm:col-span-2">
					<IconMapPin className="text-muted-foreground mt-0.5 size-4" />
					<span className="whitespace-pre-line">{user.address}</span>
				</div>
			)}
		</div>
	);
}
