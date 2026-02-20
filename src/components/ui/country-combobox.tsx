import {
	IconCheck,
	IconSelector,
	IconWorld,
} from "@tabler/icons-react";
import { countries } from "countries-list";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const COUNTRIES = Object.values(countries)
	.map((c) => c.name)
	.toSorted((a, b) => a.localeCompare(b));

interface CountryComboboxProps {
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
}

export function CountryCombobox({
	value,
	onChange,
	disabled,
}: CountryComboboxProps) {
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn(
						"h-9 w-full justify-between pl-3 font-normal",
						!value && "text-muted-foreground",
					)}
					disabled={disabled}
				>
					<span className="flex items-center gap-2">
						<IconWorld className="size-4 text-muted-foreground" />
						{value || "Select country..."}
					</span>
					<IconSelector className="size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[--radix-popover-trigger-width] p-0"
				align="start"
			>
				<Command>
					<CommandInput placeholder="Search country..." />
					<CommandList>
						<CommandEmpty>No country found.</CommandEmpty>
						<CommandGroup>
							{COUNTRIES.map((country) => (
								<CommandItem
									key={country}
									value={country}
									onSelect={() => {
										onChange(country);
										setOpen(false);
									}}
								>
									<IconCheck
										className={cn(
											"mr-2 size-4",
											value === country ? "opacity-100" : "opacity-0",
										)}
									/>
									{country}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export { COUNTRIES };
