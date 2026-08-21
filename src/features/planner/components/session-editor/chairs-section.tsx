import { IconPlus, IconUser, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/shared/ui/command";
import { Label } from "@/shared/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { useSessionEditor } from "./session-editor-context";

type Chair = {
	userId: string;
	firstName: string | null;
	lastName: string | null;
};

const userName = (u: {
	firstName: string | null;
	lastName: string | null;
	email: string;
}) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;

const chairName = (c: Pick<Chair, "firstName" | "lastName">) =>
	[c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown";

export function ChairsSection() {
	const { session, users, mutations } = useSessionEditor();
	const chairs = session.chairs;
	const [search, setSearch] = useState("");
	const [open, setOpen] = useState(false);

	const chairUserIds = new Set(chairs.map((c) => c.userId));
	const filteredUsers = (users ?? []).filter((u) => {
		if (chairUserIds.has(u.id)) return false;
		if (!search) return true;
		const q = search.toLowerCase();
		const name = [u.firstName, u.lastName]
			.filter(Boolean)
			.join(" ")
			.toLowerCase();
		return name.includes(q) || u.email.toLowerCase().includes(q);
	});

	const handleSelect = (userId: string) => {
		mutations.addChair(userId);
		setOpen(false);
		setSearch("");
	};

	return (
		<div className="space-y-2 p-4">
			<div className="flex items-center justify-between">
				<Label className="text-sm font-medium">
					Chairs{" "}
					<span className="text-muted-foreground font-normal">
						({chairs.length}/3)
					</span>
				</Label>
				{chairs.length < 3 && (
					<Popover onOpenChange={setOpen} open={open}>
						<PopoverTrigger asChild>
							<Button
								className="gap-1"
								data-testid="session-editor-add-chair"
								size="xs"
								variant="outline"
							>
								<IconPlus size={11} />
								Add chair
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-64 p-0">
							<Command>
								<CommandInput
									onValueChange={setSearch}
									placeholder="Search by name or email..."
									value={search}
								/>
								<CommandList>
									<CommandEmpty>No users found</CommandEmpty>
									<CommandGroup>
										{filteredUsers.slice(0, 20).map((u) => (
											<CommandItem
												key={u.id}
												onSelect={() => handleSelect(u.id)}
												value={userName(u)}
											>
												<IconUser className="mr-2 shrink-0" size={13} />
												<div className="min-w-0">
													<div className="truncate text-sm">{userName(u)}</div>
													<div className="text-muted-foreground truncate text-xs">
														{u.email}
													</div>
												</div>
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				)}
			</div>

			{chairs.length === 0 ? (
				<p className="text-muted-foreground text-xs">No chairs assigned</p>
			) : (
				<div className="space-y-1">
					{chairs.map((c) => (
						<div
							className="flex items-center justify-between rounded-md border px-3 py-1.5"
							key={c.userId}
						>
							<span className="text-sm">{chairName(c)}</span>
							<Button
								onClick={() => mutations.removeChair(c.userId)}
								size="icon-sm"
								variant="ghost"
							>
								<IconX size={12} />
							</Button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
