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
import { Toaster } from "sonner";
import { SpinnerSvg } from "../components/spinner-svg";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";
import { getPrimaryColorFn } from "../utils/settings.functions";

interface MyRouterContext {
	queryClient: QueryClient;
}

const themeScript = `
(function() {
  var mql = window.matchMedia('(prefers-color-scheme: dark)');
  function apply() {
    var t = localStorage.getItem('suberus-theme') || 'system';
    document.documentElement.classList.toggle('dark', t === 'dark' || (t === 'system' && mql.matches));
  }
  apply();
  mql.addEventListener('change', apply);
})();
`;

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
			return { primaryColor: await getPrimaryColorFn() };
		} catch {
			return { primaryColor: "var(--primary)" };
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
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
		scripts: [
			{
				children: themeScript,
			},
		],
	}),

	component: RootComponent,
	shellComponent: RootDocument,
});

function RootComponent() {
	// Remove loader after component load
	useEffect(() => {
		document.getElementById("__loader")?.remove();
	}, []);
	return <Outlet />;
}

function RootDocument({ children }: { children: React.ReactNode }) {
	const { primaryColor } = Route.useLoaderData();

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<div id="__loader" style={loaderStyle}>
					<SpinnerSvg color={primaryColor} />
				</div>
				{children}
				<Toaster position="top-right" richColors closeButton />
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
