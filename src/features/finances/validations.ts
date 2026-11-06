import { z } from "zod";
import { MAX_BULK_ITEMS } from "@/shared/lib/validations/zod-helpers";

export const financeRowSchema = z.object({
	label: z.string().trim().min(1).max(200),
	amountExpr: z.string().trim().max(100),
	contractor: z.string().trim().max(200).optional(),
	vatRate: z.number().int().min(0).max(100).nullable().optional(),
	amountIsGross: z.boolean().optional(),
	dueDate: z.string().max(10).optional(),
	paid: z.boolean().optional(),
	ordered: z.boolean().optional(),
});

export const saveFinancesSchema = z.object({
	expenses: z.array(financeRowSchema).max(MAX_BULK_ITEMS),
	income: z.array(financeRowSchema).max(MAX_BULK_ITEMS),
});

export type SaveFinancesInput = z.infer<typeof saveFinancesSchema>;
