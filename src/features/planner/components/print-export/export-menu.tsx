import { IconChevronDown, IconFileExport } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { PRINT_FORMATS } from "@/features/planner/print/print-options-schema";
import { Button } from "@/shared/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { FORMAT_META } from "./use-print-export";

export function ExportMenu() {
	const navigate = useNavigate();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button data-testid="print-export-menu" type="button" variant="outline">
					<IconFileExport />
					<span className="hidden sm:inline">Export</span>
					<IconChevronDown />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Printed program</DropdownMenuLabel>
					{PRINT_FORMATS.map((format) => (
						<DropdownMenuItem
							data-testid={`print-export-${format}`}
							key={format}
							onClick={() =>
								void navigate({
									to: "/admin/program-planner/export",
									search: { format },
								})
							}
						>
							<div>
								<div>
									{FORMAT_META[format].label}{" "}
									<span className="text-muted-foreground">
										.{FORMAT_META[format].ext}
									</span>
								</div>
								<div className="text-muted-foreground text-xs">
									{FORMAT_META[format].hint}
								</div>
							</div>
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
