import type { AdminUser } from "@/lib/server/admin/users"
import { roleLabels } from "@/lib/labels/user"
import { Card, CardContent } from "@/components/ui/card"

export function UserMobileCard(user: AdminUser) {
	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex items-start justify-between">
					<div>
						<p className="font-medium">
							{user.firstName} {user.lastName}
						</p>
						<p className="text-sm text-muted-foreground">{user.email}</p>
						{user.affiliation && (
							<p className="text-sm text-muted-foreground">
								{user.affiliation}
							</p>
						)}
					</div>
					<div className="text-right">
						<span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs">
							{roleLabels[user.role]}
						</span>
						{user.fee?.paid ? (
							<p className="mt-1 text-xs text-green-600">Paid</p>
						) : (
							<p className="mt-1 text-xs text-red-600">Unpaid</p>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
