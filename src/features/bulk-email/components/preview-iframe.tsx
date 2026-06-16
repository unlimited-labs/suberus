interface PreviewIframeProps {
	/** Rendered body. HTML when `isHtml`, otherwise plain text. */
	body: string;
	isHtml: boolean;
	isLoading?: boolean;
}

/**
 * Renders the email preview. HTML is shown inside a sandboxed iframe so
 * admin-authored markup/scripts can't touch the admin session; plain text is
 * shown verbatim.
 */
export function PreviewIframe({ body, isHtml, isLoading }: PreviewIframeProps) {
	return (
		<div className="rounded-md border" data-testid="email-preview">
			<div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5">
				<span className="text-xs font-medium text-muted-foreground">
					Preview
				</span>
				{isLoading ? (
					<span className="text-xs text-muted-foreground">Rendering…</span>
				) : null}
			</div>
			{isHtml ? (
				<iframe
					title="Email preview"
					sandbox=""
					srcDoc={body}
					className="h-96 w-full bg-white"
				/>
			) : (
				<pre className="h-96 overflow-auto whitespace-pre-wrap p-3 text-sm">
					{body}
				</pre>
			)}
		</div>
	);
}
