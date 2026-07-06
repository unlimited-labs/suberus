import { IconCheck, IconClock, IconSelector } from "@tabler/icons-react";
import { Fragment, useMemo, useState } from "react";
import { Button } from "@/shared/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/shared/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";

const TIMEZONES_BY_REGION: Array<{ region: string; zones: string[] }> = (() => {
	const all = Intl.supportedValuesOf("timeZone").toSorted((a, b) =>
		a.localeCompare(b),
	);
	const groups = new Map<string, string[]>();
	for (const tz of all) {
		const region = tz.includes("/") ? tz.split("/", 1)[0] : "Other";
		const list = groups.get(region) ?? [];
		list.push(tz);
		groups.set(region, list);
	}
	return [...groups.entries()]
		.toSorted(([a], [b]) => a.localeCompare(b))
		.map(([region, zones]) => ({ region, zones }));
})();

interface TimezoneComboboxProps {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	disabled?: boolean;
}

export function TimezoneCombobox({
	id,
	value,
	onChange,
	disabled,
}: TimezoneComboboxProps) {
	const [open, setOpen] = useState(false);
	const groups = useMemo(() => TIMEZONES_BY_REGION, []);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					id={id}
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
						<IconClock className="size-4 text-muted-foreground" />
						{value || "Select timezone..."}
					</span>
					<IconSelector className="size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-(--anchor-width) p-0"
				align="start"
			>
				<Command>
					<CommandInput placeholder="Search timezone..." />
					<CommandList>
						<CommandEmpty>No timezone found.</CommandEmpty>
						{groups.map((group, idx) => (
							<Fragment key={group.region}>
								{idx > 0 && <CommandSeparator />}
								<CommandGroup heading={group.region}>
									{group.zones.map((tz) => (
										<CommandItem
											key={tz}
											value={tz}
											onSelect={() => {
												onChange(tz);
												setOpen(false);
											}}
										>
											<IconCheck
												className={cn(
													"mr-2 size-4",
													value === tz ? "opacity-100" : "opacity-0",
												)}
											/>
											{tz}
										</CommandItem>
									))}
								</CommandGroup>
							</Fragment>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
