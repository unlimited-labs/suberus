import { IconCopy } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { mcpConnectionQueryOptions } from "@/features/mcp/api/mcp-connection";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Skeleton } from "@/shared/ui/skeleton";

interface McpConnectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function CopyRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-1">
			<div className="text-muted-foreground text-sm">{label}</div>
			<div className="flex items-center gap-2">
				{/* min-w-0 is load-bearing: a flex item defaults to min-width:auto, so
				    without it the nowrap content widens the row past the dialog and
				    overflow-x-auto never engages. */}
				<code className="min-w-0 flex-1 overflow-x-auto rounded bg-muted px-2 py-1.5 font-mono text-xs whitespace-nowrap">
					{value}
				</code>
				<Button
					className="shrink-0"
					variant="outline"
					size="icon"
					aria-label={`Copy ${label}`}
					data-testid={`mcp-copy-${label.toLowerCase().replace(/\s+/g, "-")}`}
					onClick={() => {
						navigator.clipboard.writeText(value);
						toast.success("Copied to clipboard");
					}}
				>
					<IconCopy className="size-4" />
				</Button>
			</div>
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
			<DialogContent className="sm:max-w-lg" data-testid="mcp-connect-dialog">
				<DialogHeader>
					<DialogTitle>Connect an AI assistant</DialogTitle>
					<DialogDescription>
						Manage this conference from an MCP-capable assistant. Every action
						runs with your account's permissions.
					</DialogDescription>
				</DialogHeader>

				{isPending && <Skeleton className="h-40 w-full" />}

				{data && !data.enabled && (
					<p
						className="text-muted-foreground text-sm"
						data-testid="mcp-disabled"
					>
						The MCP server is disabled on this instance. An administrator has to
						set <code className="font-mono">MCP_ENABLED=true</code> before
						assistants can connect.
					</p>
				)}

				{data?.enabled && (
					<div className="space-y-5">
						<CopyRow label="Server URL" value={data.url} />
						<CopyRow
							label="Claude Code"
							value={`claude mcp add --transport http suberus ${data.url}`}
						/>
						<p className="text-muted-foreground text-sm">
							On first use your assistant opens a browser window to sign in and
							ask for your approval. Approved applications are listed below.
						</p>

						<div className="space-y-2">
							<div className="font-medium text-sm">Authorized applications</div>
							{data.clients.length === 0 ? (
								<p
									className="text-muted-foreground text-sm"
									data-testid="mcp-no-clients"
								>
									No application has been authorized yet.
								</p>
							) : (
								<ul className="space-y-2" data-testid="mcp-client-list">
									{data.clients.map((client) => (
										<li
											key={client.clientId}
											className="rounded border p-2 text-sm"
										>
											<div className="font-medium">
												{client.name ?? client.clientId}
											</div>
											<div className="break-all text-muted-foreground text-xs">
												{client.clientId}
											</div>
											<div className="mt-1 flex flex-wrap items-center gap-1">
												{client.scopes.map((scope) => (
													<Badge key={scope} variant="outline">
														{scope}
													</Badge>
												))}
												{client.authorizedAt && (
													<span className="ml-auto text-muted-foreground text-xs">
														{new Date(client.authorizedAt).toLocaleDateString()}
													</span>
												)}
											</div>
										</li>
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
