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
				<span className="bg-primary/10 text-primary flex size-5 items-center justify-center rounded-full text-[11px] font-medium tabular-nums">
					{number}
				</span>
				<span className="text-sm font-medium">{label}</span>
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
			aria-label={`Copy ${label}`}
			className="group bg-muted/50 hover:border-primary/40 hover:bg-muted flex w-full min-w-0 items-center gap-2 rounded-md border py-2 pr-2 pl-3 text-left transition-colors"
			data-testid={testId}
			onClick={copy}
			type="button"
		>
			<code className="min-w-0 flex-1 overflow-x-auto font-mono text-xs whitespace-nowrap">
				{value}
			</code>
			<span className="text-muted-foreground group-hover:bg-background group-hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded transition-colors">
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
			className="animate-in fade-in slide-in-from-bottom-1 flex min-w-0 items-start gap-3 py-2.5 duration-300"
			style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
		>
			<span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold uppercase">
				{label.replace(/^https?:\/\//, "").charAt(0)}
			</span>
			<div className="min-w-0 flex-1">
				<div className="flex items-baseline gap-2">
					<span className="truncate text-sm font-medium">{label}</span>
					{client.authorizedAt && (
						<span className="text-muted-foreground ml-auto shrink-0 text-[11px] tabular-nums">
							{formatDate(client.authorizedAt)}
						</span>
					)}
				</div>
				{client.scopes.length > 0 && (
					<ul className="mt-1 flex flex-wrap gap-1">
						{client.scopes.map((scope) => (
							<li
								className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[10px]"
								key={scope}
							>
								{scope}
							</li>
						))}
					</ul>
				)}
			</div>
			<Button
				aria-label={`Remove ${label}`}
				className="text-muted-foreground hover:text-destructive size-7 shrink-0"
				data-testid="mcp-remove-client"
				disabled={revoke.isPending}
				onClick={() => revoke.mutate()}
				size="icon"
				type="button"
				variant="ghost"
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
				className="h-7 w-[5.5rem] text-xs"
				data-testid="mcp-callback-port"
				id="mcp-callback-port"
				inputMode="numeric"
				max={65535}
				min={1024}
				onChange={(e) => setPort(e.target.value)}
				type="number"
				value={port}
			/>
			<Button
				className="h-7 px-2 text-xs"
				data-testid="mcp-mint-client"
				disabled={mint.isPending}
				onClick={() => {
					minted.current = true;
					mint.mutate(Number(port));
				}}
				size="sm"
				type="button"
				variant="ghost"
			>
				<IconRefresh className="mr-1 size-3.5" />
				Re-issue
			</Button>
			{clientId && (
				<span
					className="text-muted-foreground w-full truncate font-mono text-[11px]"
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
		<Dialog onOpenChange={onOpenChange} open={open}>
			{/* DialogContent is a grid whose auto track sizes to max-content, so the
			    nowrap command below stretched it past the dialog. Pinning the track
			    to minmax(0,1fr) contains any child, not just today's. */}
			<DialogContent
				className="grid-cols-[minmax(0,1fr)] sm:max-w-lg"
				data-testid="mcp-connect-dialog"
			>
				<DialogHeader className="min-w-0 flex-row items-start gap-3 space-y-0 text-left">
					<span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
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
						<Tabs className="min-w-0 gap-4" defaultValue="web">
							<TabsList className="w-full">
								<TabsTrigger data-testid="mcp-tab-web" value="web">
									Web
								</TabsTrigger>
								<TabsTrigger data-testid="mcp-tab-cli" value="cli">
									CLI / Desktop
								</TabsTrigger>
							</TabsList>

							<TabsContent className="min-w-0 space-y-4" value="web">
								<Step label="Add this URL as a custom connector" number={1}>
									<CopyBlock
										label="server URL"
										testId="mcp-copy-url"
										value={data.url}
									/>
								</Step>
								<Step label="Sign in and approve" number={2} />
								<p className="text-muted-foreground text-sm">
									Claude on the web identifies itself, so it needs nothing else
									from this dialog.
								</p>
							</TabsContent>

							<TabsContent className="min-w-0 space-y-4" value="cli">
								<Step label="Run this in your terminal" number={1}>
									<div className="space-y-1.5">
										<CopyBlock
											label="register command"
											testId="mcp-copy-command"
											value={connectCommand({
												url: data.url,
												clientId: data.desktopClient?.clientId,
												callbackPort: data.desktopClient?.callbackPort,
											})}
										/>
										<CredentialControls
											callbackPort={data.desktopClient?.callbackPort}
											clientId={data.desktopClient?.clientId}
										/>
									</div>
								</Step>
								<Step label="Sign in and approve" number={2} />
								<p className="text-muted-foreground text-sm">
									Claude Code cannot publish its callback port, so these
									credentials are tied to the one above. Start it on another
									port and sign-in fails — set the port here and re-issue.
								</p>
							</TabsContent>
						</Tabs>

						<div className="min-w-0 border-t pt-4">
							<div className="mb-1 text-sm font-medium">
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
											client={client}
											index={i}
											key={client.clientId}
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
