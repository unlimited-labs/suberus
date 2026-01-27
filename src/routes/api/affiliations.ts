import { createFileRoute } from "@tanstack/react-router"
import { prisma } from "@/db"

export const Route = createFileRoute("/api/affiliations")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const url = new URL(request.url)
				const q = url.searchParams.get("q")?.trim() ?? ""

				const affiliations = await prisma.affiliation.findMany({
					where: q
						? {
								name: {
									contains: q,
									mode: "insensitive",
								},
							}
						: undefined,
					orderBy: { name: "asc" },
					take: 20,
					select: {
						id: true,
						name: true,
					},
				})

				return new Response(JSON.stringify(affiliations), {
					headers: { "Content-Type": "application/json" },
				})
			},
			POST: async ({ request }: { request: Request }) => {
				const body = (await request.json()) as { name: string }
				const name = body.name?.trim()

				if (!name) {
					return new Response(JSON.stringify({ error: "Name is required" }), {
						status: 400,
						headers: { "Content-Type": "application/json" },
					})
				}

				// Upsert to handle race conditions
				const affiliation = await prisma.affiliation.upsert({
					where: { name },
					update: {},
					create: { name },
					select: {
						id: true,
						name: true,
					},
				})

				return new Response(JSON.stringify(affiliation), {
					status: 201,
					headers: { "Content-Type": "application/json" },
				})
			},
		},
	},
})
