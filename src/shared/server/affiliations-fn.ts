import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	findAffiliationById,
	findAffiliations,
	upsertAffiliation,
} from "@/shared/server/affiliations";

const getAffiliationsSchema = z.object({
	q: z.string().optional(),
});

export const getAffiliations = createServerFn({ method: "GET" })
	.inputValidator(getAffiliationsSchema)
	.handler(async ({ data }) => {
		return findAffiliations(data.q ?? "");
	});

const getAffiliationByIdSchema = z.object({
	id: z.uuid(),
});

export const getAffiliationById = createServerFn({ method: "GET" })
	.inputValidator(getAffiliationByIdSchema)
	.handler(async ({ data }) => {
		return findAffiliationById(data.id);
	});

const createAffiliationSchema = z.object({
	name: z.string().min(1, "Name is required"),
});

export const createAffiliation = createServerFn({ method: "POST" })
	.inputValidator(createAffiliationSchema)
	.handler(async ({ data }) => {
		return upsertAffiliation(data.name.trim());
	});
