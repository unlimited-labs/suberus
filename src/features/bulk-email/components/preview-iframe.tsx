import { IconDeviceDesktop, IconDeviceMobile } from "@tabler/icons-react";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";

interface PreviewIframeProps {
	body: string;
	isHtml: boolean;
	isLoading?: boolean;
}

const VIEWPORTS = [
	{ id: "desktop", label: "Desktop", icon: IconDeviceDesktop },
	{ id: "mobile", label: "Mobile", icon: IconDeviceMobile },
] as const;

type Viewport = (typeof VIEWPORTS)[number]["id"];

const FRAME = {
	desktop: "w-full",
	mobile: "w-[390px] border border-border shadow-sm",
} satisfies Record<Viewport, string>;

export function PreviewIframe({ body, isHtml, isLoading }: PreviewIframeProps) {
	const [viewport, setViewport] = useState<Viewport>("desktop");

	return (
		<div
			className="border-border rounded-md border"
			data-testid="email-preview"
		>
			<div className="border-border bg-muted/40 flex items-center justify-between gap-2 border-b px-3 py-1.5">
				<span className="text-muted-foreground text-xs font-medium">
					Preview
				</span>
				<div className="flex items-center gap-2">
					{isLoading ? (
						<span className="text-muted-foreground text-xs">Rendering…</span>
					) : null}
					{isHtml ? (
						<div className="border-border bg-background flex rounded-md border p-0.5">
							{VIEWPORTS.map((v) => (
								<button
									aria-pressed={viewport === v.id}
									className={cn(
										"flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
										viewport === v.id
											? "bg-muted text-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
									data-testid={`preview-${v.id}`}
									key={v.id}
									onClick={() => setViewport(v.id)}
									title={v.label}
									type="button"
								>
									<v.icon className="size-3.5" />
									<span className="hidden sm:inline">{v.label}</span>
								</button>
							))}
						</div>
					) : null}
				</div>
			</div>
			{isHtml ? (
				<div className="bg-muted/30 fade flex justify-center overflow-auto p-3">
					<iframe
						className={cn("h-96 shrink-0 rounded-sm bg-white", FRAME[viewport])}
						sandbox=""
						srcDoc={body}
						title="Email preview"
					/>
				</div>
			) : (
				<pre className="fade h-96 overflow-auto p-3 text-sm whitespace-pre-wrap">
					{body}
				</pre>
			)}
		</div>
	);
}
