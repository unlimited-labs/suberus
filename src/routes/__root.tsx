import { IconError404 } from "@tabler/icons-react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { type CSSProperties, useEffect } from "react";
import { SpinnerSvg } from "../components/spinner-svg";
import { ThemeProvider } from "../components/theme-provider";
import { Button } from "../components/ui/button";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import { getThemeFn } from "../lib/theme";
import appCss from "../styles.css?url";
import { getPrimaryColorFn } from "../utils/settings.functions";

interface MyRouterContext {
	queryClient: QueryClient;
}

const loaderStyle: CSSProperties = {
	position: "fixed",
	inset: 0,
	zIndex: 9999,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	backgroundColor: "var(--background)",
};

export const Route = createRootRouteWithContext<MyRouterContext>()({
	loader: async () => {
		try {
			const [primaryColor, theme] = await Promise.all([
				getPrimaryColorFn(),
				getThemeFn(),
			]);
			return { primaryColor, theme };
		} catch {
			return { primaryColor: "var(--primary)", theme: "system" as const };
		}
	},
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Suberus - Conference Management System",
			},
			{
				name: "color-scheme",
				content: "light dark",
			},
			{
				name: "apple-mobile-web-app-title",
				content: "Suberus",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				href: "/favicon.png",
			},
		],
	}),

	component: RootComponent,
	shellComponent: RootDocument,
	notFoundComponent: NotFoundPage,
});

function NotFoundPage() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
			<IconError404 className="size-24 text-muted-foreground" />
			<h1 className="text-3xl font-bold">Page not found</h1>
			<p className="max-w-md text-muted-foreground">
				The page you are looking for does not exist or has been moved.
			</p>
			<Button asChild>
				<a href="/">Go to Dashboard</a>
			</Button>
		</div>
	);
}

function RootComponent() {
	// Remove loader after component load
	useEffect(() => {
		document.getElementById("__loader")?.remove();
	}, []);
	return <Outlet />;
}

function RootDocument({ children }: { children: React.ReactNode }) {
	const { primaryColor, theme } = Route.useLoaderData();

	return (
		<html
			lang="en"
			className={theme === "dark" ? "dark" : ""}
			suppressHydrationWarning
		>
			<head>
				<HeadContent />
			</head>
			<body>
				<div id="__loader" style={loaderStyle}>
					<SpinnerSvg color={primaryColor} />
				</div>
				<ThemeProvider theme={theme}>
					<TooltipProvider>
						{children}
						<Toaster position="top-right" richColors />
					</TooltipProvider>
				</ThemeProvider>
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
