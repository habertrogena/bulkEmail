import { z } from "zod";

export const campaignSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  bodyHtml: z.string().min(1, "Email body is required"),
  fromAddress: z.string().email("Choose a valid from address"),
  replyTo: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, "Invalid reply-to address"),
});

export type CampaignFormValues = z.infer<typeof campaignSchema>;
