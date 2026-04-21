import { IconSearch, IconX } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";

interface Props {
	value: string;
	onChange: (v: string) => void;
}

export function SidebarSearch({ value, onChange }: Props) {
	return (
		<div className="border-b px-2 py-2">
			<div className="relative">
				<IconSearch
					size={12}
					className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder="Search title, author, keyword…"
					data-testid="sidebar-search"
					className="h-7 pl-7 text-xs"
				/>
				{value && (
					<button
						type="button"
						onClick={() => onChange("")}
						className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						aria-label="Clear search"
					>
						<IconX size={11} />
					</button>
				)}
			</div>
		</div>
	);
}
