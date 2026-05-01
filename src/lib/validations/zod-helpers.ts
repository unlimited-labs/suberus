import { z } from "zod";

export const zDateString = z.iso.datetime().transform((s) => new Date(s));
