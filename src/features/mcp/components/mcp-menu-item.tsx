import { IconPlug } from "@tabler/icons-react";
import { DropdownMenuItem } from "@/shared/ui/dropdown-menu";

/**
 * Entry only — clicking an item unmounts the menu subtree, so the dialog must
 * be a sibling of the dropdown. MCP_ENABLED is server-only, so the parent gates
 * on a query it warms while the layout is mounted: the item never flashes where
 * the server is off, and never pops in after the menu opens.
 */
export function McpMenuItem({ onOpen }: { onOpen: () => void }) {
	return (
		<DropdownMenuItem onClick={onOpen} data-testid="user-menu-mcp">
			<IconPlug className="mr-2" />
			Connect AI assistant
		</DropdownMenuItem>
	);
}
