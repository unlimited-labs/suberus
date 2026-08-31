import {
	IconDownload,
	IconExternalLink,
	IconFileCertificate,
	IconFiles,
	IconShieldCheck,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { z } from "zod";
import { adminRouteMiddleware } from "@/features/auth/server/middleware";
import { documentTemplatesQueryOptions } from "@/features/documents/api/documents";
import { GeneratedDocumentsTab } from "@/features/documents/components/generated-documents-tab";
import { TemplatesTab } from "@/features/documents/components/templates-tab";
import { documentSigningQueryOptions } from "@/features/settings/api/document-signing";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

const searchSchema = z.object({ tab: z.string().optional() });

export const Route = createFileRoute("/_app/admin/_layout/documents/")({
	server: {
		middleware: [adminRouteMiddleware],
	},
	validateSearch: searchSchema,
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(documentTemplatesQueryOptions()),
			context.queryClient.ensureQueryData(documentSigningQueryOptions()),
		]);
	},
	component: AdminDocumentsPage,
});

const emptySubscribe = () => () => {};
const getVerifyUrlSnapshot = () => `${window.location.origin}/verify-document`;
const getServerVerifyUrlSnapshot = () => "/verify-document";

function SigningBanner() {
	const { data: signing } = useSuspenseQuery(documentSigningQueryOptions());
	const verifyUrl = useSyncExternalStore(
		emptySubscribe,
		getVerifyUrlSnapshot,
		getServerVerifyUrlSnapshot,
	);
	if (!signing?.enabled) return null;
	return (
		<div className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm">
			<div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
				<IconShieldCheck className="size-5" />
				Generated documents are digitally signed
			</div>
			<p className="text-muted-foreground mt-1">
				Any PDF reader (Adobe, Foxit…) verifies the signature automatically. A
				self-signed certificate shows as “valid — identity not trusted” until
				the recipient imports the public certificate; or anyone can confirm
				authenticity on the verification page below.
			</p>
			<div className="mt-3 flex flex-wrap items-center gap-3">
				<a
					className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline dark:text-emerald-400"
					data-testid="verify-page-link"
					href={verifyUrl}
					rel="noreferrer"
					target="_blank"
				>
					<IconExternalLink className="size-4" />
					{verifyUrl}
				</a>
				<a
					className="text-muted-foreground inline-flex items-center gap-1.5 hover:underline"
					href="/api/documents/signing-cert"
				>
					<IconDownload className="size-4" />
					Download public certificate
				</a>
			</div>
		</div>
	);
}

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
					<SigningBanner />
					<Tabs
						onValueChange={(value) =>
							navigate({
								search: { tab: value },
								replace: true,
								resetScroll: false,
							})
						}
						value={activeTab}
					>
						<TabsList className="mb-6 w-full justify-start" variant="line">
							{tabs.map((t) => (
								<TabsTrigger
									className="gap-1.5 px-3 py-2"
									key={t.id}
									value={t.id}
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
