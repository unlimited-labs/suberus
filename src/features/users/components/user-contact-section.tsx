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
		<div className="space-y-3">
			<h3 className="text-sm font-medium text-muted-foreground">
				Contact Information
			</h3>
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex items-center gap-2">
					<IconMail className="size-4 text-muted-foreground" />
					<a
						href={`mailto:${user.email}`}
						className="text-primary hover:underline"
					>
						{user.email}
					</a>
				</div>
				{user.affiliation && (
					<div className="flex items-center gap-2">
						<IconBuilding className="size-4 text-muted-foreground" />
						<span>{user.affiliation}</span>
					</div>
				)}
				{user.orcid && (
					<div className="flex items-center gap-2">
						<IconId className="size-4 text-muted-foreground" />
						<span>ORCID: {user.orcid}</span>
					</div>
				)}
				{user.country && (
					<div className="flex items-center gap-2">
						<IconWorld className="size-4 text-muted-foreground" />
						<span>{user.country}</span>
					</div>
				)}
				{user.address && (
					<div className="flex items-start gap-2 sm:col-span-2">
						<IconMapPin className="mt-0.5 size-4 text-muted-foreground" />
						<span className="whitespace-pre-line">{user.address}</span>
					</div>
				)}
			</div>
		</div>
	);
}
