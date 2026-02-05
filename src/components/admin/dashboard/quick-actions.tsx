import {
	IconAdjustments,
	IconDownload,
	IconFileStack,
	IconUsers,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuickActions() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Quick Actions</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 gap-3">
					<Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
						<Link to="/api/admin/users/export" target="_blank">
							<IconDownload className="size-5" />
							<span className="text-sm">Export Users</span>
						</Link>
					</Button>
					<Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
						<Link to="/admin/users">
							<IconUsers className="size-5" />
							<span className="text-sm">Manage Users</span>
						</Link>
					</Button>
					<Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
						<Link to="/admin/submissions">
							<IconFileStack className="size-5" />
							<span className="text-sm">View Submissions</span>
						</Link>
					</Button>
					<Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
						<Link to="/admin/settings">
							<IconAdjustments className="size-5" />
							<span className="text-sm">Configuration</span>
						</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
