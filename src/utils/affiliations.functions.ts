import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { findAffiliations, upsertAffiliation } from "./affiliations.server";

const getAffiliationsSchema = z.object({
	q: z.string().optional(),
});

export const getAffiliations = createServerFn({ method: "GET" })
	.inputValidator(getAffiliationsSchema)
	.handler(async ({ data }) => {
		return findAffiliations(data.q ?? "");
	});

const createAffiliationSchema = z.object({
	name: z.string().min(1, "Name is required"),
});

export const createAffiliation = createServerFn({ method: "POST" })
	.inputValidator(createAffiliationSchema)
	.handler(async ({ data }) => {
		return upsertAffiliation(data.name.trim());
	});
