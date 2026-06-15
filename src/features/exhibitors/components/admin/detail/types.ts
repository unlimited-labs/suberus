import type { getExhibitorDetail } from "@/features/exhibitors/server/exhibitors";

export type ExhibitorDetail = NonNullable<
	Awaited<ReturnType<typeof getExhibitorDetail>>
>;
