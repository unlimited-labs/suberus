import { IconPlug } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { mcpConnectionQueryOptions } from "@/features/mcp/api/mcp-connection";
import { useAdminAuth } from "@/shared/hooks/use-admin-auth";
import { DropdownMenuItem } from "@/shared/ui/dropdown-menu";

/**
 * Renders the entry only; the dialog it opens has to be a sibling of the
 * dropdown, because clicking an item unmounts the menu's subtree and would take
 * the dialog with it.
 *
 * MCP_ENABLED is server-only, so whether this instance runs an MCP server comes
 * from the connection query rather than an env var mirrored to the client. The
 * entry stays hidden until that answer arrives, so it never flashes on an
 * instance that has the server off.
 */
export function McpMenuItem({ onOpen }: { onOpen: () => void }) {
	const { isAdmin } = useAdminAuth();

	const { data } = useQuery({
		...mcpConnectionQueryOptions(),
		enabled: isAdmin,
		staleTime: 5 * 60 * 1000,
	});

	if (!isAdmin || !data?.enabled) return null;

	return (
		<DropdownMenuItem onClick={onOpen} data-testid="user-menu-mcp">
			<IconPlug className="mr-2" />
			Connect AI assistant
		</DropdownMenuItem>
	);
}
