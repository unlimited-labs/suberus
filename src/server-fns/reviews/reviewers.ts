import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getReviewerUsers } from "@/lib/server/reviewers";
import { adminMiddleware } from "@/shared/server/middleware/auth";

export const reviewerUsersQueryOptions = () =>
	queryOptions({
		queryKey: ["admin", "reviewers"],
		queryFn: () => getReviewerUsersFn(),
	});

/**
 * Get reviewer users (admin only)
 */
export const getReviewerUsersFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return getReviewerUsers();
	});
