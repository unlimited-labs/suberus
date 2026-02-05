import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { AdminDashboardMetrics } from "@/utils/admin-dashboard.server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ReviewProgressProps {
	data: AdminDashboardMetrics["reviews"] | undefined;
}

const PROGRESS_COLORS = {
	completed: "#22c55e",
	remaining: "#e5e7eb",
};

export function ReviewProgress({ data }: ReviewProgressProps) {
	if (!data) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Review Progress</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex h-[300px] items-center justify-center">
						<p className="text-muted-foreground">Loading...</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	const { byStatus, completionRate, totalAssignments } = data;

	const chartData = [
		{ name: "Completed", value: byStatus.COMPLETED, fill: PROGRESS_COLORS.completed },
		{
			name: "Remaining",
			value: totalAssignments - byStatus.COMPLETED,
			fill: PROGRESS_COLORS.remaining,
		},
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle>Review Progress</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-center">
					<ResponsiveContainer width="50%" height={150}>
						<PieChart>
							<Pie
								data={chartData}
								cx="50%"
								cy="50%"
								innerRadius={40}
								outerRadius={60}
								dataKey="value"
								strokeWidth={0}
							>
								{chartData.map((entry, index) => (
									<Cell key={`cell-${index}`} fill={entry.fill} />
								))}
							</Pie>
						</PieChart>
					</ResponsiveContainer>
					<div className="text-center ml-4">
						<p className="text-3xl font-bold">{completionRate.toFixed(0)}%</p>
						<p className="text-sm text-muted-foreground">Completion Rate</p>
					</div>
				</div>

				<Progress value={completionRate} className="h-2" />

				<div className="grid grid-cols-3 gap-4 pt-2">
					<div className="text-center">
						<p className="text-2xl font-semibold">{byStatus.PENDING}</p>
						<p className="text-xs text-muted-foreground">Pending</p>
					</div>
					<div className="text-center">
						<p className="text-2xl font-semibold">{byStatus.IN_PROGRESS}</p>
						<p className="text-xs text-muted-foreground">In Progress</p>
					</div>
					<div className="text-center">
						<p className="text-2xl font-semibold">{byStatus.COMPLETED}</p>
						<p className="text-xs text-muted-foreground">Completed</p>
					</div>
				</div>

				{byStatus.OVERDUE > 0 && (
					<div className="flex justify-center pt-2">
						<Badge variant="destructive">
							{byStatus.OVERDUE} Overdue
						</Badge>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
