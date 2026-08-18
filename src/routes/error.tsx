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
			<IconAlertTriangle className="size-24 text-muted-foreground" />
			<h1 className="text-3xl font-bold">Something went wrong</h1>
			<p className="max-w-md text-muted-foreground">
				{error_description ?? "The request could not be completed."}
			</p>
			{error ? (
				<code className="rounded bg-muted px-2 py-1 text-muted-foreground text-sm">
					{error}
				</code>
			) : null}
			<Button asChild>
				<Link to="/" preload="intent">
					Go to Dashboard
				</Link>
			</Button>
		</div>
	);
}
