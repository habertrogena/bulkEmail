-- Rename SES-specific columns to provider-agnostic names now that Company can
-- be backed by either SesEmailProvider or ResendEmailProvider.
ALTER TABLE "Company" RENAME COLUMN "dkimTokens" TO "dnsRecords";
ALTER TABLE "Recipient" RENAME COLUMN "sesMessageId" TO "providerMessageId";
ALTER INDEX "Recipient_sesMessageId_idx" RENAME TO "Recipient_providerMessageId_idx";

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "providerDomainId" TEXT,
ADD COLUMN     "emailProvider" TEXT NOT NULL DEFAULT 'ses';
