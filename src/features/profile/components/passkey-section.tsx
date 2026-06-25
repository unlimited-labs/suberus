import { IconFingerprint, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/shared/lib/auth-client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

const passkeysQueryKey = ["passkeys"] as const;

export function PasskeySection() {
	const queryClient = useQueryClient();
	const [name, setName] = useState("");

	const { data: passkeys = [], isLoading } = useQuery({
		queryKey: passkeysQueryKey,
		queryFn: async () => {
			const res = await authClient.passkey.listUserPasskeys();
			if (res.error) {
				throw new Error(res.error.message ?? "Failed to load passkeys");
			}
			return res.data ?? [];
		},
	});

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: passkeysQueryKey });

	const addMutation = useMutation({
		mutationFn: async (deviceName: string) => {
			const res = await authClient.passkey.addPasskey({
				name: deviceName.trim() || undefined,
			});
			if (res?.error) {
				throw new Error(res.error.message ?? "Failed to add passkey");
			}
		},
		onSuccess: async () => {
			setName("");
			toast.success("Passkey added");
			await invalidate();
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await authClient.passkey.deletePasskey({ id });
			if (res.error) {
				throw new Error(res.error.message ?? "Failed to remove passkey");
			}
		},
		onSuccess: async () => {
			toast.success("Passkey removed");
			await invalidate();
		},
		onError: (e: Error) => toast.error(e.message),
	});

	return (
		<div className="space-y-4 border-t pt-4">
			<div>
				<h3 className="text-sm font-medium">Passkeys</h3>
				<p className="text-sm text-muted-foreground">
					Sign in with your fingerprint, Face ID, or device PIN.
				</p>
			</div>

			{isLoading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : passkeys.length === 0 ? (
				<p className="text-sm text-muted-foreground">No passkeys yet.</p>
			) : (
				<ul className="space-y-2" data-testid="passkey-list">
					{passkeys.map((pk) => (
						<li
							key={pk.id}
							className="flex items-center justify-between rounded-lg border p-3"
						>
							<div className="flex items-center gap-2">
								<IconFingerprint className="size-4 text-muted-foreground" />
								<span className="text-sm">{pk.name || "Passkey"}</span>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Remove passkey"
								disabled={deleteMutation.isPending}
								onClick={() => deleteMutation.mutate(pk.id)}
							>
								<IconTrash className="size-4 text-destructive" />
							</Button>
						</li>
					))}
				</ul>
			)}

			<div className="flex items-end gap-2">
				<Input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Device name (e.g. My iPhone)"
					className="h-9"
					data-testid="passkey-name"
				/>
				<Button
					type="button"
					variant="outline"
					className="h-9 shrink-0"
					data-testid="passkey-add"
					disabled={addMutation.isPending}
					onClick={() => addMutation.mutate(name)}
				>
					<IconFingerprint className="size-4" />
					Add passkey
				</Button>
			</div>
		</div>
	);
}
