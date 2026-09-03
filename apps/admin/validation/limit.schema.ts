import { z } from "zod";

export const limitSchema = z.object({
  monthlyEmailLimit: z.number().int().min(0, "Must be 0 or greater"),
  planTier: z.enum(["starter", "pro", "enterprise"]),
});

export type LimitFormValues = z.infer<typeof limitSchema>;
