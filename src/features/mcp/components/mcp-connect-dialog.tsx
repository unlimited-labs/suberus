import { IconCheck, IconCopy, IconPlugConnected } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	mcpConnectionQueryOptions,
	mintMcpDesktopClient,
} from "@/features/mcp/api/mcp-connection";
import { connectCommand } from "@/features/mcp/labels";
import type {
	McpAuthorizedClient,
	McpDesktopClient,
} from "@/features/mcp/server/connection";
import { DEFAULT_CALLBACK_PORT } from "@/features/mcp/validations";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";

interface McpConnectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function CommandBlock({
	step,
	label,
	value,
}: {
	step: number;
	label: string;
	value: string;
}) {
	const [copied, setCopied] = useState(false);

	// navigator.clipboard is undefined outside a secure context (a plain-HTTP
	// instance), and writeText can still be rejected by permissions.
	const copy = () => {
		if (!navigator.clipboard) {
			toast.error("Copying needs a secure (HTTPS) connection");
			return;
		}
		navigator.clipboard
			.writeText(value)
			.then(() => {
				setCopied(true);
				toast.success("Copied to clipboard");
				setTimeout(() => setCopied(false), 1500);
			})
			.catch(() => toast.error("Could not copy to clipboard"));
	};

	return (
		<div className="min-w-0 space-y-1.5">
			<div className="flex items-center gap-2">
				<span className="flex size-5 items-center justify-center rounded-full bg-primary/10 font-medium text-[11px] text-primary tabular-nums">
					{step}
				</span>
				<span className="font-medium text-sm">{label}</span>
			</div>
			<button
				type="button"
				onClick={copy}
				aria-label={`Copy ${label}`}
				data-testid={`mcp-copy-${step}`}
				className="group flex w-full min-w-0 items-center gap-2 rounded-md border bg-muted/50 py-2 pr-2 pl-3 text-left transition-colors hover:border-primary/40 hover:bg-muted"
			>
				<code className="min-w-0 flex-1 overflow-x-auto font-mono text-xs whitespace-nowrap">
					{value}
				</code>
				<span className="flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors group-hover:bg-background group-hover:text-foreground">
					{copied ? (
						<IconCheck className="size-4 text-emerald-600 dark:text-emerald-500" />
					) : (
						<IconCopy className="size-4" />
					)}
				</span>
			</button>
		</div>
	);
}

function ClientRow({
	client,
	index,
}: {
	client: McpAuthorizedClient;
	index: number;
}) {
	const label = client.name ?? client.clientId;
	return (
		<li
			className="flex min-w-0 animate-in items-start gap-3 py-2.5 fade-in slide-in-from-bottom-1 duration-300"
			style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
		>
			<span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 font-semibold text-primary text-xs uppercase">
				{label.replace(/^https?:\/\//, "").charAt(0)}
			</span>
			<div className="min-w-0 flex-1">
				<div className="flex items-baseline gap-2">
					<span className="truncate font-medium text-sm">{label}</span>
					{client.authorizedAt && (
						<span className="ml-auto shrink-0 text-[11px] text-muted-foreground tabular-nums">
							{new Date(client.authorizedAt).toLocaleDateString()}
						</span>
					)}
				</div>
				{client.scopes.length > 0 && (
					<p className="truncate font-mono text-[11px] text-muted-foreground">
						{client.scopes.join(" · ")}
					</p>
				)}
			</div>
		</li>
	);
}

function CredentialsPanel({
	desktopClient,
}: {
	desktopClient: McpDesktopClient | null;
}) {
	const queryClient = useQueryClient();
	const [port, setPort] = useState(
		String(desktopClient?.callbackPort ?? DEFAULT_CALLBACK_PORT),
	);

	const mint = useMutation({
		mutationFn: (callbackPort: number) =>
			mintMcpDesktopClient({ data: { callbackPort } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["mcp", "connection"] });
			toast.success("Credentials ready");
		},
		onError: () => toast.error("Could not create the credentials"),
	});

	return (
		<div className="min-w-0 space-y-3 rounded-lg border p-3">
			<div>
				<div className="font-medium text-sm">Assistant credentials</div>
				<p className="text-muted-foreground text-sm">
					{desktopClient
						? "The command above carries these credentials. Re-issue them if your assistant listens on another port."
						: "Issue a client the assistant signs in with. Keep the port your assistant listens on."}
				</p>
			</div>
			<div className="flex flex-col gap-2 sm:flex-row sm:items-end">
				<div className="min-w-0 flex-1 space-y-1.5">
					<Label htmlFor="mcp-callback-port">Callback port</Label>
					<Input
						id="mcp-callback-port"
						data-testid="mcp-callback-port"
						type="number"
						inputMode="numeric"
						min={1024}
						max={65535}
						value={port}
						onChange={(e) => setPort(e.target.value)}
					/>
				</div>
				<Button
					type="button"
					variant={desktopClient ? "outline" : "default"}
					data-testid="mcp-mint-client"
					disabled={mint.isPending}
					onClick={() => mint.mutate(Number(port))}
					className="w-full sm:w-auto"
				>
					{desktopClient ? "Re-issue" : "Create credentials"}
				</Button>
			</div>
			{desktopClient && (
				<p
					className="min-w-0 truncate font-mono text-[11px] text-muted-foreground"
					data-testid="mcp-client-id"
				>
					{desktopClient.clientId}
				</p>
			)}
		</div>
	);
}

export function McpConnectDialog({
	open,
	onOpenChange,
}: McpConnectDialogProps) {
	const { data, isPending } = useQuery({
		...mcpConnectionQueryOptions(),
		enabled: open,
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{/* DialogContent is a grid whose auto track sizes to max-content, so the
			    nowrap command below stretched it past the dialog. Pinning the track
			    to minmax(0,1fr) contains any child, not just today's. */}
			<DialogContent
				className="grid-cols-[minmax(0,1fr)] sm:max-w-lg"
				data-testid="mcp-connect-dialog"
			>
				<DialogHeader className="min-w-0 flex-row items-start gap-3 space-y-0 text-left">
					<span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
						<IconPlugConnected className="size-5" />
					</span>
					<div className="min-w-0 flex-1">
						<DialogTitle>Connect an AI assistant</DialogTitle>
						<DialogDescription>
							Drive this conference from an MCP-capable assistant. It acts with
							your account's permissions.
						</DialogDescription>
					</div>
				</DialogHeader>

				{isPending && (
					<div className="space-y-3">
						<Skeleton className="h-14 w-full" />
						<Skeleton className="h-14 w-full" />
					</div>
				)}

				{data && !data.enabled && (
					<div
						className="rounded-lg border border-dashed p-4 text-center"
						data-testid="mcp-disabled"
					>
						<p className="font-medium text-sm">The MCP server is off</p>
						<p className="mt-1 text-muted-foreground text-sm">
							An administrator has to set{" "}
							<code className="font-mono text-xs">MCP_ENABLED=true</code> on
							this instance before assistants can connect.
						</p>
					</div>
				)}

				{data?.enabled && (
					<div className="min-w-0 space-y-6">
						<div className="flex items-center gap-2 text-muted-foreground text-xs">
							<span className="relative flex size-2">
								<span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
								<span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
							</span>
							Server is live
						</div>

						<div className="min-w-0 space-y-4">
							<CommandBlock
								step={1}
								label="Register the server"
								value={connectCommand({
									url: data.url,
									clientId: data.desktopClient?.clientId,
									callbackPort: data.desktopClient?.callbackPort,
								})}
							/>
							<CommandBlock
								step={2}
								label="Or use the URL directly"
								value={data.url}
							/>
							<CredentialsPanel desktopClient={data.desktopClient} />
						</div>

						<p className="text-muted-foreground text-sm">
							Your assistant then opens a browser window to sign in and ask for
							your approval.
						</p>

						<div className="min-w-0 border-t pt-4">
							<div className="mb-1 font-medium text-sm">
								Authorized applications
							</div>
							{data.clients.length === 0 ? (
								<p
									className="text-muted-foreground text-sm"
									data-testid="mcp-no-clients"
								>
									Nothing authorized yet.
								</p>
							) : (
								<ul className="min-w-0 divide-y" data-testid="mcp-client-list">
									{data.clients.map((client, i) => (
										<ClientRow
											key={client.clientId}
											client={client}
											index={i}
										/>
									))}
								</ul>
							)}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
