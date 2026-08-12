import { IconPlug } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { mcpConnectionQueryOptions } from "@/features/mcp/api/mcp-connection";
import { useAdminAuth } from "@/shared/hooks/use-admin-auth";
import { DropdownMenuItem } from "@/shared/ui/dropdown-menu";

/**
 * Entry only — clicking an item unmounts the menu subtree, so the dialog must
 * be a sibling of the dropdown. MCP_ENABLED is server-only, hence the query;
 * hidden until it answers so it never flashes where the server is off.
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
