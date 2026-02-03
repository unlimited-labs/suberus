import { createFileRoute, useSearch } from "@tanstack/react-router"
import { IconDashboard } from "@tabler/icons-react"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { PageHeader } from "@/components/layout/page-header"

const searchSchema = z.object({
	verified: z.enum(["true"]).optional(),
})

export const Route = createFileRoute("/_app/")({
	validateSearch: searchSchema,
	component: DashboardPage,
})

function DashboardPage() {
	const { verified } = useSearch({ from: "/_app/" })
	const toastShown = useRef(false)

	useEffect(() => {
		if (verified === "true" && !toastShown.current) {
			toastShown.current = true
			toast.success("Email verified successfully!")
		}
	}, [verified])

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconDashboard} title="Dashboard" />
			<div className="flex-1 space-y-6 p-6">
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<StatCard title="Total Submissions" value="0" />
					<StatCard title="Under Review" value="0" />
					<StatCard title="Pending Reviews" value="0" />
					<StatCard title="Accepted" value="0" />
				</div>
			</div>
		</div>
	)
}

function StatCard({ title, value }: { title: string; value: string }) {
	return (
		<div className="rounded-lg border border-border bg-card p-4">
			<p className="text-sm text-muted-foreground">{title}</p>
			<p className="text-2xl font-semibold">{value}</p>
		</div>
	)
}
