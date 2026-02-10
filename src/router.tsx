import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { RouteSpinner } from "./components/route-spinner";
import * as TanstackQuery from "./integrations/tanstack-query/root-provider";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

// Create a new router instance
export const getRouter = () => {
	const rqContext = TanstackQuery.getContext();

	const router = createRouter({
		routeTree,
		context: {
			...rqContext,
		},

		defaultPreload: "intent",
		defaultPendingComponent: RouteSpinner,
		defaultPendingMs: 200,
		defaultPendingMinMs: 300,
	});

	setupRouterSsrQueryIntegration({
		router,
		queryClient: rqContext.queryClient,
	});

	return router;
};
