import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import * as TanstackQuery from "./integrations/tanstack-query/root-provider";
import { routeTree } from "./routeTree.gen";
import { RouteError } from "./shared/components/route-error";
import { RouteSpinner } from "./shared/components/route-spinner";

export const getRouter = () => {
	const rqContext = TanstackQuery.getContext();

	const router = createRouter({
		routeTree,
		context: {
			...rqContext,
		},

		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		defaultPendingComponent: RouteSpinner,
		defaultErrorComponent: RouteError,
		defaultPendingMs: 200,
		defaultPendingMinMs: 300,
	});

	setupRouterSsrQueryIntegration({
		router,
		queryClient: rqContext.queryClient,
	});

	return router;
};
