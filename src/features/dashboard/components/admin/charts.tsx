import { useId } from "react";
import {
	Area,
	AreaChart,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
} from "recharts";
import { lookup } from "@/shared/lib/lookup";

interface SparklineChartProps {
	data: number[];
	color: string;
}

export function SparklineChart({ data, color }: SparklineChartProps) {
	const gradientId = useId();
	const chartData = data.map((value, i) => ({ i, value }));

	return (
		<ResponsiveContainer height={48} width="100%">
			<AreaChart
				data={chartData}
				margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
			>
				<defs>
					<linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
						<stop offset="0%" stopColor={color} stopOpacity={0.2} />
						<stop offset="100%" stopColor={color} stopOpacity={0} />
					</linearGradient>
				</defs>
				<Area
					dataKey="value"
					dot={false}
					fill={`url(#${gradientId})`}
					isAnimationActive={false}
					stroke={color}
					strokeWidth={1.5}
					type="monotone"
				/>
			</AreaChart>
		</ResponsiveContainer>
	);
}

const PROGRESS_COLORS = {
	completed: "#22c55e",
	remaining: "#e5e7eb",
};

interface ReviewCompletionPieProps {
	completed: number;
	total: number;
}

export function ReviewCompletionPie({
	completed,
	total,
}: ReviewCompletionPieProps) {
	const chartData = [
		{
			name: "Completed",
			value: completed,
			fill: PROGRESS_COLORS.completed,
		},
		{
			name: "Remaining",
			value: total - completed,
			fill: PROGRESS_COLORS.remaining,
		},
	];

	return (
		<ResponsiveContainer height={150} width="50%">
			<PieChart>
				<Pie
					cx="50%"
					cy="50%"
					data={chartData}
					dataKey="value"
					innerRadius={40}
					outerRadius={60}
					strokeWidth={0}
				>
					{chartData.map((entry) => (
						<Cell fill={entry.fill} key={entry.name} />
					))}
				</Pie>
			</PieChart>
		</ResponsiveContainer>
	);
}

const STATUS_COLORS = {
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
} satisfies Record<string, string>;

interface SubmissionStatusDatum {
	name: string;
	value: number;
	status: string;
}

interface SubmissionStatusPieProps {
	data: SubmissionStatusDatum[];
	total: number;
}

export function SubmissionStatusPie({ data, total }: SubmissionStatusPieProps) {
	return (
		<ResponsiveContainer height={300} width="100%">
			<PieChart>
				<Pie
					cx="50%"
					cy="50%"
					data={data}
					dataKey="value"
					fill="#8884d8"
					label={({ name, percent }) =>
						`${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
					}
					labelLine={false}
					outerRadius={80}
				>
					{data.map((entry) => (
						<Cell
							fill={lookup(STATUS_COLORS, entry.status) || "#6b7280"}
							key={entry.status}
						/>
					))}
				</Pie>
				<Tooltip
					formatter={(value) => {
						const num = Number(value ?? 0);
						const percent = ((num / total) * 100).toFixed(1);
						return `${num} (${percent}%)`;
					}}
					labelFormatter={() => "Count"}
				/>
			</PieChart>
		</ResponsiveContainer>
	);
}
