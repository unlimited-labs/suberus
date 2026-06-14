import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/features/auth/server/middleware";
import { getReviewerUsers } from "@/features/reviews/server/reviewers";

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
