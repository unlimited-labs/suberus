import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface MetricSparklineProps {
	data: number[];
	color: string;
}

export function MetricSparkline({ data, color }: MetricSparklineProps) {
	const gradientId = useId();
	const chartData = data.map((value, i) => ({ i, value }));

	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-x-0 bottom-0 h-12 opacity-70"
		>
			<ResponsiveContainer width="100%" height={48}>
				<AreaChart
					data={chartData}
					margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
				>
					<defs>
						<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor={color} stopOpacity={0.2} />
							<stop offset="100%" stopColor={color} stopOpacity={0} />
						</linearGradient>
					</defs>
					<Area
						type="monotone"
						dataKey="value"
						stroke={color}
						strokeWidth={1.5}
						fill={`url(#${gradientId})`}
						dot={false}
						isAnimationActive={false}
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}
