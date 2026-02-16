import {
	IconLoader2,
	IconPalette,
	IconPhoto,
	IconPhotoUp,
	IconTrash,
	IconUpload,
} from "@tabler/icons-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import type { BrandingSettings } from "@/utils/settings.functions";
import {
	deleteAuthBackgroundFn,
	updateBrandingSettingsFn,
	uploadAuthBackgroundFn,
} from "@/utils/settings.functions";

interface BrandingSettingsTabProps {
	initialData: BrandingSettings;
}

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BG_SIZE_MB = 5;
const MAX_BG_SIZE_BYTES = MAX_BG_SIZE_MB * 1024 * 1024;

export function BrandingSettingsTab({ initialData }: BrandingSettingsTabProps) {
	const [data, setData] = useState(initialData);
	const [isSaving, setIsSaving] = useState(false);
	const [bgUploading, setBgUploading] = useState(false);
	const [bgRemoving, setBgRemoving] = useState(false);
	const bgInputRef = useRef<HTMLInputElement>(null);

	const handleChange = (
		field: keyof BrandingSettings,
		value: string | number,
	) => {
		setData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await updateBrandingSettingsFn({ data });
			toast.success("Branding settings saved");
		} catch {
			toast.error("Failed to save branding settings");
		} finally {
			setIsSaving(false);
		}
	};

	const handleBgUpload = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;

			if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
				toast.error("Invalid file type. Use JPG, PNG, or WebP.");
				return;
			}
			if (file.size > MAX_BG_SIZE_BYTES) {
				toast.error(`File size exceeds ${MAX_BG_SIZE_MB}MB limit.`);
				return;
			}

			setBgUploading(true);
			try {
				const base64 = await new Promise<string>((resolve, reject) => {
					const reader = new FileReader();
					reader.onloadend = () => {
						const result = reader.result as string;
						// Strip data URL prefix to get raw base64
						resolve(result.split(",")[1]);
					};
					reader.onerror = reject;
					reader.readAsDataURL(file);
				});

				const { url } = await uploadAuthBackgroundFn({
					data: { fileBase64: base64, mimeType: file.type },
				});
				setData((prev) => ({ ...prev, authBackgroundUrl: url }));
				toast.success("Background image uploaded");
			} catch {
				toast.error("Failed to upload background image");
			} finally {
				setBgUploading(false);
				if (bgInputRef.current) bgInputRef.current.value = "";
			}
		},
		[],
	);

	const handleBgRemove = useCallback(async () => {
		setBgRemoving(true);
		try {
			await deleteAuthBackgroundFn();
			setData((prev) => ({ ...prev, authBackgroundUrl: "" }));
			toast.success("Background image removed");
		} catch {
			toast.error("Failed to remove background image");
		} finally {
			setBgRemoving(false);
		}
	}, []);

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
					<div className="flex items-center gap-2">
						<Checkbox
							id="logoDarkInvert"
							checked={data.logoDarkInvert}
							onCheckedChange={(checked) =>
								setData((prev) => ({
									...prev,
									logoDarkInvert: checked === true,
								}))
							}
						/>
						<Label htmlFor="logoDarkInvert" className="cursor-pointer">
							Invert logo in dark mode
						</Label>
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
				icon={IconPhotoUp}
				title="Auth Background Image"
				description="Background image for login and registration pages"
				delay={50}
			>
				<div className="space-y-4">
					{data.authBackgroundUrl && (
						<div
							className="overflow-hidden rounded-lg border border-border/50"
							data-testid="auth-background-preview"
						>
							<img
								src={data.authBackgroundUrl}
								alt="Auth background preview"
								className="h-40 w-full object-cover"
							/>
						</div>
					)}

					<div className="flex flex-wrap gap-2">
						<input
							ref={bgInputRef}
							type="file"
							accept={ACCEPTED_IMAGE_TYPES.join(",")}
							onChange={handleBgUpload}
							className="hidden"
							aria-label="Upload auth background"
						/>
						<Button
							variant="outline"
							size="sm"
							onClick={() => bgInputRef.current?.click()}
							disabled={bgUploading || bgRemoving}
							data-testid="auth-background-upload"
						>
							{bgUploading ? (
								<IconLoader2 className="mr-2 size-4 animate-spin" />
							) : (
								<IconUpload className="mr-2 size-4" />
							)}
							{data.authBackgroundUrl ? "Replace image" : "Upload image"}
						</Button>

						{data.authBackgroundUrl && (
							<Button
								variant="ghost"
								size="sm"
								onClick={handleBgRemove}
								disabled={bgUploading || bgRemoving}
								data-testid="auth-background-remove"
							>
								{bgRemoving ? (
									<IconLoader2 className="mr-2 size-4 animate-spin" />
								) : (
									<IconTrash className="mr-2 size-4" />
								)}
								Remove
							</Button>
						)}
					</div>

					{data.authBackgroundUrl && (
						<div className="space-y-2">
							<Label>Overlay darkness: {data.authBgOverlay}%</Label>
							<Slider
								value={[data.authBgOverlay]}
								onValueChange={([v]) => handleChange("authBgOverlay", v)}
								min={0}
								max={100}
								step={5}
							/>
							<p className="text-xs text-muted-foreground">
								Controls how dark the overlay is on the auth background image
							</p>
						</div>
					)}

					<p className="text-xs text-muted-foreground">
						Accepted formats: JPG, PNG, WebP. Max size: {MAX_BG_SIZE_MB}MB.
					</p>
				</div>
				{data.authBackgroundUrl && (
					<div className="mt-6 flex justify-end">
						<Button onClick={handleSave} disabled={isSaving}>
							{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
							Save
						</Button>
					</div>
				)}
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
