import { lazy, Suspense } from "react";

const SparklineChart = lazy(() =>
	import("./charts").then((m) => ({ default: m.SparklineChart })),
);

interface MetricSparklineProps {
	data: number[];
	color: string;
}

export function MetricSparkline({ data, color }: MetricSparklineProps) {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-x-0 bottom-0 h-12 opacity-70"
		>
			<Suspense fallback={<div className="h-12" />}>
				<SparklineChart color={color} data={data} />
			</Suspense>
		</div>
	);
}
