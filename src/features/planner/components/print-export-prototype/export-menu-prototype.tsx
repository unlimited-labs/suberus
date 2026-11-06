import { IconChevronDown, IconFileExport } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/shared/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { FORMATS } from "./prototype-model";

export function ExportMenuPrototype() {
	const navigate = useNavigate();
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button type="button" variant="outline">
					<IconFileExport />
					Export
					<IconChevronDown />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64">
				<DropdownMenuLabel>Printed program</DropdownMenuLabel>
				{FORMATS.map((f) => (
					<DropdownMenuItem
						key={f.value}
						onClick={() =>
							void navigate({
								to: "/admin/program-planner/export-prototype",
								search: { format: f.value, variant: "A", sidecar: "on" },
							})
						}
					>
						<div>
							<div>
								{f.label}{" "}
								<span className="text-muted-foreground">.{f.ext}</span>
							</div>
							<div className="text-muted-foreground text-xs">{f.hint}</div>
						</div>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
