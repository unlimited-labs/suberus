import { IconAlertTriangle } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/shared/ui/button";

const searchSchema = z.object({
	error: z.string().optional(),
	error_description: z.string().optional(),
});

export const Route = createFileRoute("/error")({
	validateSearch: searchSchema,
	component: AuthErrorPage,
});

function AuthErrorPage() {
	const { error, error_description } = Route.useSearch();

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
			<IconAlertTriangle className="text-muted-foreground size-24" />
			<h1 className="text-3xl font-bold">Something went wrong</h1>
			<p className="text-muted-foreground max-w-md">
				{error_description ?? "The request could not be completed."}
			</p>
			{error ? (
				<code className="bg-muted text-muted-foreground rounded px-2 py-1 text-sm">
					{error}
				</code>
			) : null}
			<Button asChild>
				<Link preload="intent" to="/">
					Go to Dashboard
				</Link>
			</Button>
		</div>
	);
}
