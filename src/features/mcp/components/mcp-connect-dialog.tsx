import {
	IconCheck,
	IconCopy,
	IconPlugConnected,
	IconRefresh,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	mcpConnectionQueryOptions,
	mintMcpDesktopClient,
	revokeMcpClient,
} from "@/features/mcp/api/mcp-connection";
import { connectCommand } from "@/features/mcp/labels";
import type { McpAuthorizedClient } from "@/features/mcp/server/connection";
import { DEFAULT_CALLBACK_PORT } from "@/features/mcp/validations";
import { useDateFormat } from "@/shared/hooks/use-date-format";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

interface McpConnectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function Step({
	number,
	label,
	children,
}: {
	number: number;
	label: string;
	children?: ReactNode;
}) {
	return (
		<div className="min-w-0 space-y-1.5">
			<div className="flex items-center gap-2">
				<span className="flex size-5 items-center justify-center rounded-full bg-primary/10 font-medium text-[11px] text-primary tabular-nums">
					{number}
				</span>
				<span className="font-medium text-sm">{label}</span>
			</div>
			{children && <div className="min-w-0 pl-7">{children}</div>}
		</div>
	);
}

function CopyBlock({
	value,
	label,
	testId,
}: {
	value: string;
	label: string;
	testId: string;
}) {
	const [copied, setCopied] = useState(false);

	// Undefined outside a secure context, and writeText can still be refused.
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
		<button
			type="button"
			onClick={copy}
			aria-label={`Copy ${label}`}
			data-testid={testId}
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
	);
}

function ClientRow({
	client,
	index,
}: {
	client: McpAuthorizedClient;
	index: number;
}) {
	const queryClient = useQueryClient();
	const { formatDate } = useDateFormat();
	const label = client.name ?? client.clientId;

	const revoke = useMutation({
		mutationFn: () => revokeMcpClient({ data: { clientId: client.clientId } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: mcpConnectionQueryOptions().queryKey,
			});
			toast.success("Access removed");
		},
		onError: () => toast.error("Could not remove the access"),
	});
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
							{formatDate(client.authorizedAt)}
						</span>
					)}
				</div>
				{client.scopes.length > 0 && (
					<ul className="mt-1 flex flex-wrap gap-1">
						{client.scopes.map((scope) => (
							<li
								key={scope}
								className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
							>
								{scope}
							</li>
						))}
					</ul>
				)}
			</div>
			<Button
				type="button"
				size="icon"
				variant="ghost"
				aria-label={`Remove ${label}`}
				data-testid="mcp-remove-client"
				disabled={revoke.isPending}
				className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
				onClick={() => revoke.mutate()}
			>
				<IconTrash className="size-4" />
			</Button>
		</li>
	);
}

function CredentialControls({
	clientId,
	callbackPort,
}: {
	clientId: string | undefined;
	callbackPort: number | undefined;
}) {
	const queryClient = useQueryClient();
	const [port, setPort] = useState(
		String(callbackPort ?? DEFAULT_CALLBACK_PORT),
	);
	const minted = useRef(false);

	const refresh = () =>
		queryClient.invalidateQueries({
			queryKey: mcpConnectionQueryOptions().queryKey,
		});

	const mint = useMutation({
		mutationFn: (nextPort: number) =>
			mintMcpDesktopClient({ data: { callbackPort: nextPort } }),
		onSuccess: refresh,
		onError: () => toast.error("Could not issue credentials"),
	});

	// Issued on open so the command is complete when read. Minting is idempotent;
	// the ref stops a re-render firing a second write before the query catches up.
	useEffect(() => {
		if (clientId || minted.current || mint.isPending) return;
		minted.current = true;
		mint.mutate(callbackPort ?? DEFAULT_CALLBACK_PORT);
	}, [clientId, callbackPort, mint]);

	return (
		<div className="flex flex-wrap items-center gap-1.5 pt-0.5">
			<Label
				className="text-muted-foreground text-xs"
				htmlFor="mcp-callback-port"
			>
				Callback port
			</Label>
			<Input
				id="mcp-callback-port"
				data-testid="mcp-callback-port"
				type="number"
				inputMode="numeric"
				min={1024}
				max={65535}
				value={port}
				onChange={(e) => setPort(e.target.value)}
				className="h-7 w-[5.5rem] text-xs"
			/>
			<Button
				type="button"
				size="sm"
				variant="ghost"
				className="h-7 px-2 text-xs"
				data-testid="mcp-mint-client"
				disabled={mint.isPending}
				onClick={() => {
					minted.current = true;
					mint.mutate(Number(port));
				}}
			>
				<IconRefresh className="mr-1 size-3.5" />
				Re-issue
			</Button>
			{clientId && (
				<span
					className="w-full truncate font-mono text-[11px] text-muted-foreground"
					data-testid="mcp-client-id"
				>
					{clientId}
				</span>
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
						<Skeleton className="h-9 w-full" />
						<Skeleton className="h-14 w-full" />
					</div>
				)}

				{data?.enabled && (
					<div className="min-w-0 space-y-6">
						<Tabs defaultValue="web" className="min-w-0 gap-4">
							<TabsList className="w-full">
								<TabsTrigger value="web" data-testid="mcp-tab-web">
									Web
								</TabsTrigger>
								<TabsTrigger value="cli" data-testid="mcp-tab-cli">
									CLI / Desktop
								</TabsTrigger>
							</TabsList>

							<TabsContent value="web" className="min-w-0 space-y-4">
								<Step number={1} label="Add this URL as a custom connector">
									<CopyBlock
										value={data.url}
										label="server URL"
										testId="mcp-copy-url"
									/>
								</Step>
								<Step number={2} label="Sign in and approve" />
								<p className="text-muted-foreground text-sm">
									Claude on the web identifies itself, so it needs nothing else
									from this dialog.
								</p>
							</TabsContent>

							<TabsContent value="cli" className="min-w-0 space-y-4">
								<Step number={1} label="Run this in your terminal">
									<div className="space-y-1.5">
										<CopyBlock
											value={connectCommand({
												url: data.url,
												clientId: data.desktopClient?.clientId,
												callbackPort: data.desktopClient?.callbackPort,
											})}
											label="register command"
											testId="mcp-copy-command"
										/>
										<CredentialControls
											clientId={data.desktopClient?.clientId}
											callbackPort={data.desktopClient?.callbackPort}
										/>
									</div>
								</Step>
								<Step number={2} label="Sign in and approve" />
								<p className="text-muted-foreground text-sm">
									Claude Code cannot publish its callback port, so these
									credentials are tied to the one above. Start it on another
									port and sign-in fails — set the port here and re-issue.
								</p>
							</TabsContent>
						</Tabs>

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
