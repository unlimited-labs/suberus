import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	findAffiliations,
	upsertAffiliation,
	getAffiliationById as getAffiliationByIdServer,
} from "./affiliations.server";

const getAffiliationsSchema = z.object({
	q: z.string().optional(),
});

export const getAffiliations = createServerFn({ method: "GET" })
	.inputValidator(getAffiliationsSchema)
	.handler(async ({ data }) => {
		return findAffiliations(data.q ?? "");
	});

const getAffiliationByIdSchema = z.object({
	id: z.string().uuid(),
});

export const getAffiliationById = createServerFn({ method: "GET" })
	.inputValidator(getAffiliationByIdSchema)
	.handler(async ({ data }) => {
		return getAffiliationByIdServer(data.id);
	});

const createAffiliationSchema = z.object({
	name: z.string().min(1, "Name is required"),
});

export const createAffiliation = createServerFn({ method: "POST" })
	.inputValidator(createAffiliationSchema)
	.handler(async ({ data }) => {
		return upsertAffiliation(data.name.trim());
	});
