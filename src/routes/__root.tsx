import { IconError404 } from "@tabler/icons-react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { type CSSProperties, useEffect } from "react";
import {
	getOgMetadataFn,
	getPrimaryColorFn,
} from "@/features/settings/api/settings";
import { APP_SETTINGS_DEFAULTS } from "@/features/settings/defaults";
import { getThemeFn } from "@/shared/lib/theme";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import { SpinnerSvg } from "../shared/components/spinner-svg";
import { ThemeProvider } from "../shared/components/theme-provider";
import { Button } from "../shared/ui/button";
import { Toaster } from "../shared/ui/sonner";
import { TooltipProvider } from "../shared/ui/tooltip";
import appCss from "../styles.css?url";

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
			const [primaryColor, theme, og] = await Promise.all([
				getPrimaryColorFn(),
				getThemeFn(),
				getOgMetadataFn(),
			]);
			return { primaryColor, theme, og };
		} catch {
			return {
				primaryColor: "var(--primary)",
				theme: "system" as const,
				og: null,
			};
		}
	},
	head: ({ loaderData }) => ({
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
			...(loaderData?.og
				? [
						{ name: "description", content: loaderData.og.description },
						{ property: "og:type", content: "website" },
						{ property: "og:title", content: loaderData.og.title },
						{ property: "og:description", content: loaderData.og.description },
						{ property: "og:image", content: loaderData.og.imageUrl },
						{ property: "og:image:width", content: "512" },
						{ property: "og:image:height", content: "512" },
						{ name: "twitter:card", content: "summary" },
					]
				: []),
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				type: "image/png",
				href: "/favicon-96x96.png",
				sizes: "96x96",
			},
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg",
			},
			{
				rel: "shortcut icon",
				href: "/favicon.ico",
			},
			{
				rel: "apple-touch-icon",
				sizes: "180x180",
				href: "/apple-touch-icon.png",
			},
			{
				rel: "manifest",
				href: "/api/manifest",
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
				<Link to="/" preload="intent">
					Go to Dashboard
				</Link>
			</Button>
		</div>
	);
}

function RootComponent() {
	useEffect(() => {
		document.getElementById("__loader")?.remove();
	}, []);
	return <Outlet />;
}

function buildBrandVars(primaryColor: string): CSSProperties | undefined {
	if (
		!primaryColor ||
		primaryColor === "var(--primary)" ||
		primaryColor === APP_SETTINGS_DEFAULTS.BRANDING_PRIMARY_COLOR
	) {
		return undefined;
	}
	return {
		"--primary": primaryColor,
		"--ring": primaryColor,
		"--sidebar-primary": primaryColor,
		"--sidebar-ring": primaryColor,
		"--chart-1": primaryColor,
	} as CSSProperties;
}

function RootDocument({ children }: { children: React.ReactNode }) {
	const { primaryColor, theme } = Route.useLoaderData();

	return (
		<html
			lang="en"
			className={theme === "dark" ? "dark" : ""}
			style={buildBrandVars(primaryColor)}
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
