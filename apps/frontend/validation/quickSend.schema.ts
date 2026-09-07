import { z } from "zod";

export const quickSendSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  bodyHtml: z.string().min(1, "Email body is required"),
  fromAddress: z.string().email("Choose a valid from address"),
  replyTo: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, "Invalid reply-to address"),
  recipients: z.string().min(1, "Enter at least one recipient email"),
});

export type QuickSendFormValues = z.infer<typeof quickSendSchema>;

/** Splits a manually-typed recipient list on commas, semicolons, whitespace, or newlines. */
export function parseRecipients(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,;]+/)
        .map((email) => email.trim())
        .filter(Boolean),
    ),
  );
}
