import { createFileRoute } from "@tanstack/react-router"
import { IconSettings } from "@tabler/icons-react"
import { PageHeader } from "@/components/layout/page-header"

export const Route = createFileRoute("/_app/settings")({
	component: SettingsPage,
})

function SettingsPage() {
	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconSettings} title="Settings" />
			<div className="flex-1 p-6">
				<div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
					Settings coming soon
				</div>
			</div>
		</div>
	)
}
