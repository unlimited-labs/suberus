import { IconLoader2, IconPalette, IconPhoto } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BrandingSettings } from "@/lib/mock-data/admin-settings";

interface BrandingSettingsTabProps {
	initialData: BrandingSettings;
}

export function BrandingSettingsTab({ initialData }: BrandingSettingsTabProps) {
	const [data, setData] = useState(initialData);
	const [isSaving, setIsSaving] = useState(false);

	const handleChange = (field: keyof BrandingSettings, value: string) => {
		setData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await new Promise((resolve) => setTimeout(resolve, 800));
			toast.success("Branding settings saved");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<SettingsSection
				icon={IconPhoto}
				title="Logo & Graphics"
				description="Conference logo and favicon"
			>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="logoUrl">Logo URL</Label>
						<Input
							id="logoUrl"
							value={data.logoUrl}
							onChange={(e) => handleChange("logoUrl", e.target.value)}
							placeholder="https://example.com/logo.png"
						/>
						{data.logoUrl && (
							<div className="mt-2 rounded-lg border border-border/50 bg-muted/30 p-4">
								<img
									src={data.logoUrl}
									alt="Logo preview"
									className="max-h-16 object-contain"
									onError={(e) => {
										e.currentTarget.style.display = "none";
									}}
								/>
							</div>
						)}
					</div>
					<div className="space-y-2">
						<Label htmlFor="faviconUrl">Favicon URL</Label>
						<Input
							id="faviconUrl"
							value={data.faviconUrl}
							onChange={(e) => handleChange("faviconUrl", e.target.value)}
							placeholder="https://example.com/favicon.ico"
						/>
					</div>
				</div>
				<div className="mt-6 flex justify-end">
					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						Save
					</Button>
				</div>
			</SettingsSection>

			<SettingsSection
				icon={IconPalette}
				title="Theme Colors"
				description="Customize interface colors"
				delay={100}
			>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="primaryColor">Primary color</Label>
						<div className="flex gap-2">
							<Input
								id="primaryColor"
								type="color"
								value={data.primaryColor}
								onChange={(e) => handleChange("primaryColor", e.target.value)}
								className="h-8 w-12 cursor-pointer p-0.5"
							/>
							<Input
								value={data.primaryColor}
								onChange={(e) => handleChange("primaryColor", e.target.value)}
								placeholder="#3b82f6"
								className="flex-1 font-mono uppercase"
							/>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor="secondaryColor">Secondary color</Label>
						<div className="flex gap-2">
							<Input
								id="secondaryColor"
								type="color"
								value={data.secondaryColor}
								onChange={(e) => handleChange("secondaryColor", e.target.value)}
								className="h-8 w-12 cursor-pointer p-0.5"
							/>
							<Input
								value={data.secondaryColor}
								onChange={(e) => handleChange("secondaryColor", e.target.value)}
								placeholder="#8b5cf6"
								className="flex-1 font-mono uppercase"
							/>
						</div>
					</div>
				</div>
				<div className="mt-4 flex gap-3">
					<div
						className="size-12 rounded-lg shadow-sm"
						style={{ backgroundColor: data.primaryColor }}
					/>
					<div
						className="size-12 rounded-lg shadow-sm"
						style={{ backgroundColor: data.secondaryColor }}
					/>
				</div>
				<div className="mt-6 flex justify-end">
					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						Save
					</Button>
				</div>
			</SettingsSection>

			<SettingsSection
				icon={IconPalette}
				title="Footer"
				description="Text displayed in the page footer"
				delay={200}
			>
				<div className="space-y-2">
					<Label htmlFor="footerText">Footer text</Label>
					<Textarea
						id="footerText"
						value={data.footerText}
						onChange={(e) => handleChange("footerText", e.target.value)}
						placeholder="© 2026 Conference Name"
						className="min-h-20"
					/>
				</div>
				<div className="mt-6 flex justify-end">
					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						Save
					</Button>
				</div>
			</SettingsSection>
		</div>
	);
}
