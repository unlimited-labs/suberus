import { IconAlertCircle, IconVersions } from "@tabler/icons-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

interface VersionSelectorProps {
	versions: Array<{ id: string; version: number }>;
	currentVersion: number;
	selectedVersion: number;
	onVersionChange: (version: number) => void;
}

export function VersionSelector({
	versions,
	currentVersion,
	selectedVersion,
	onVersionChange,
}: VersionSelectorProps) {
	const isViewingOlderVersion = selectedVersion < currentVersion;

	if (versions.length <= 1) {
		return null;
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<IconVersions className="text-muted-foreground size-4" />
				<span className="text-muted-foreground text-xs">Version</span>
			</div>
			<Select
				items={versions.map((v) => ({
					value: v.version.toString(),
					label: `Version ${v.version}${v.version === currentVersion ? " (current)" : ""}`,
				}))}
				onValueChange={(value) => onVersionChange(Number(value))}
				value={selectedVersion.toString()}
			>
				<SelectTrigger className="w-full">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{versions.map((v) => (
						<SelectItem key={v.id} value={v.version.toString()}>
							Version {v.version}
							{v.version === currentVersion && " (current)"}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{isViewingOlderVersion && (
				<div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
					<IconAlertCircle className="size-4 flex-shrink-0" />
					<span className="text-xs">Viewing older version</span>
				</div>
			)}
		</div>
	);
}
