import { z } from "zod";

// Mirrors the backend's @IsFQDN() check on AddDomainDto.
const FQDN_PATTERN = /^(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.(?!-)[a-zA-Z0-9-]{1,63}(?<!-))+$/;

export const domainSchema = z.object({
  domain: z.string().trim().regex(FQDN_PATTERN, "Enter a valid domain (e.g. mail.example.com)"),
});

export type DomainFormValues = z.infer<typeof domainSchema>;

export const senderSchema = z.object({
  address: z.string().email("Enter a valid email address"),
});

export type SenderFormValues = z.infer<typeof senderSchema>;
