import { IconSearch, IconX } from "@tabler/icons-react";
import { Input } from "@/shared/ui/input";

interface Props {
	value: string;
	onChange: (v: string) => void;
}

export function SidebarSearch({ value, onChange }: Props) {
	return (
		<div className="border-b p-2">
			<div className="relative">
				<IconSearch
					className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2"
					size={12}
				/>
				<Input
					className="h-7 pl-7 text-xs"
					data-testid="sidebar-search"
					onChange={(e) => onChange(e.target.value)}
					placeholder="Search title, author, keyword…"
					value={value}
				/>
				{value && (
					<button
						aria-label="Clear search"
						className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
						onClick={() => onChange("")}
						type="button"
					>
						<IconX size={11} />
					</button>
				)}
			</div>
		</div>
	);
}
