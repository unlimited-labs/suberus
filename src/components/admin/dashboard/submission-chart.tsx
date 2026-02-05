import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminDashboardMetrics } from "@/utils/admin-dashboard.server";

interface SubmissionChartProps {
	data: AdminDashboardMetrics["submissions"] | undefined;
}

const STATUS_COLORS: Record<string, string> = {
	ACCEPTED: "#22c55e",
	CONDITIONALLY_ACCEPTED: "#86efac",
	REJECTED: "#ef4444",
	UNDER_REVIEW: "#eab308",
	SUBMITTED: "#3b82f6",
	AWAITING_DECISION: "#f97316",
	REVIEWS_COMPLETE: "#8b5cf6",
	REVISE_REQUIRED: "#f59e0b",
	RESUBMITTED: "#06b6d4",
	DRAFT: "#6b7280",
	WITHDRAWN: "#9ca3af",
};

const STATUS_LABELS: Record<string, string> = {
	ACCEPTED: "Accepted",
	CONDITIONALLY_ACCEPTED: "Cond. Accepted",
	REJECTED: "Rejected",
	UNDER_REVIEW: "Under Review",
	SUBMITTED: "Submitted",
	AWAITING_DECISION: "Awaiting Decision",
	REVIEWS_COMPLETE: "Reviews Complete",
	REVISE_REQUIRED: "Revise Required",
	RESUBMITTED: "Resubmitted",
	DRAFT: "Draft",
	WITHDRAWN: "Withdrawn",
};

export function SubmissionChart({ data }: SubmissionChartProps) {
	if (!data) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Submissions by Status</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex h-[300px] items-center justify-center">
						<p className="text-muted-foreground">Loading...</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	const chartData = Object.entries(data.byStatus)
		.filter(([_, value]) => value > 0)
		.map(([status, value]) => ({
			name: STATUS_LABELS[status] || status,
			value,
			status,
		}));

	if (chartData.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Submissions by Status</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex h-[300px] items-center justify-center">
						<p className="text-muted-foreground">No submissions yet</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	const total = chartData.reduce((sum, item) => sum + item.value, 0);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Submissions by Status</CardTitle>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={300}>
					<PieChart>
						<Pie
							data={chartData}
							cx="50%"
							cy="50%"
							labelLine={false}
							label={({ name, percent }) =>
								`${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
							}
							outerRadius={80}
							fill="#8884d8"
							dataKey="value"
						>
							{chartData.map((entry) => (
								<Cell
									key={entry.status}
									fill={STATUS_COLORS[entry.status] || "#6b7280"}
								/>
							))}
						</Pie>
						<Tooltip
							formatter={(value: number | undefined) => {
								if (value === undefined) return "0";
								const percent = ((value / total) * 100).toFixed(1);
								return `${value} (${percent}%)`;
							}}
							labelFormatter={() => "Count"}
						/>
					</PieChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}
