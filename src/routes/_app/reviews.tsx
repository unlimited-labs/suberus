import { createFileRoute } from "@tanstack/react-router"
import { IconClipboardCheck } from "@tabler/icons-react"
import { PageHeader } from "@/components/layout/page-header"

export const Route = createFileRoute("/_app/reviews")({
	component: ReviewsPage,
})

function ReviewsPage() {
	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconClipboardCheck} title="Reviews" />
			<div className="flex-1 p-6">
				<div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
					No reviews assigned
				</div>
			</div>
		</div>
	)
}
