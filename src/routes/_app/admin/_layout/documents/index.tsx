import { IconFileCertificate, IconFiles } from "@tabler/icons-react";
import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { z } from "zod";
import { adminRouteMiddleware } from "@/features/auth/server/middleware";
import { documentTemplatesQueryOptions } from "@/features/documents/api/documents";
import { GeneratedDocumentsTab } from "@/features/documents/components/generated-documents-tab";
import { TemplatesTab } from "@/features/documents/components/templates-tab";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

const searchSchema = z.object({ tab: z.string().optional() });

export const Route = createFileRoute("/_app/admin/_layout/documents/")({
	server: {
		middleware: [adminRouteMiddleware],
	},
	validateSearch: searchSchema,
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(documentTemplatesQueryOptions());
	},
	component: AdminDocumentsPage,
});

const tabs = [
	{ id: "templates", label: "Templates", icon: IconFileCertificate },
	{ id: "generated", label: "Generated documents", icon: IconFiles },
];

function AdminDocumentsPage() {
	const { tab } = useSearch({ from: "/_app/admin/_layout/documents/" });
	const activeTab = tab ?? "templates";
	const navigate = useNavigate({ from: Route.fullPath });

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileCertificate} title="Documents" />
			<div className="flex-1 overflow-auto p-4 sm:p-8">
				<div className="mx-auto max-w-5xl">
					<Tabs
						value={activeTab}
						onValueChange={(value) =>
							navigate({
								search: { tab: value },
								replace: true,
								resetScroll: false,
							})
						}
					>
						<TabsList variant="line" className="mb-6 w-full justify-start">
							{tabs.map((t) => (
								<TabsTrigger
									key={t.id}
									value={t.id}
									className="gap-1.5 px-3 py-2"
								>
									<t.icon className="size-4" />
									<span>{t.label}</span>
								</TabsTrigger>
							))}
						</TabsList>

						<TabsContent value="templates">
							<TemplatesTab />
						</TabsContent>
						<TabsContent value="generated">
							<GeneratedDocumentsTab />
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}
