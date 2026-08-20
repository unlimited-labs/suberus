import { IconDeviceDesktop, IconDeviceMobile } from "@tabler/icons-react";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";

interface PreviewIframeProps {
	/** Rendered body. HTML when `isHtml`, otherwise plain text. */
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

/**
 * Renders the email preview. HTML is shown inside a sandboxed iframe so
 * admin-authored markup/scripts can't touch the admin session; a viewport
 * toggle constrains the iframe to a phone width for the mobile check. Plain
 * text is shown verbatim.
 */
export function PreviewIframe({ body, isHtml, isLoading }: PreviewIframeProps) {
	const [viewport, setViewport] = useState<Viewport>("desktop");

	return (
		<div
			className="rounded-md border border-border"
			data-testid="email-preview"
		>
			<div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-1.5">
				<span className="text-xs font-medium text-muted-foreground">
					Preview
				</span>
				<div className="flex items-center gap-2">
					{isLoading ? (
						<span className="text-xs text-muted-foreground">Rendering…</span>
					) : null}
					{isHtml ? (
						<div className="flex rounded-md border border-border bg-background p-0.5">
							{VIEWPORTS.map((v) => (
								<button
									key={v.id}
									type="button"
									data-testid={`preview-${v.id}`}
									aria-pressed={viewport === v.id}
									title={v.label}
									onClick={() => setViewport(v.id)}
									className={cn(
										"flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
										viewport === v.id
											? "bg-muted text-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
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
				<div className="flex justify-center overflow-auto bg-muted/30 p-3">
					<iframe
						title="Email preview"
						sandbox=""
						srcDoc={body}
						className={cn("h-96 shrink-0 rounded-sm bg-white", FRAME[viewport])}
					/>
				</div>
			) : (
				<pre className="h-96 overflow-auto whitespace-pre-wrap p-3 text-sm">
					{body}
				</pre>
			)}
		</div>
	);
}
