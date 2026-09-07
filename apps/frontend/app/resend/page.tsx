"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DOMPurify from "dompurify";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCompanies } from "@/hooks/useCompanies";
import { useCampaigns } from "@/hooks/useCampaigns";
import { quickSendSchema, QuickSendFormValues, parseRecipients } from "@/validation/quickSend.schema";

export default function ResendQuickSendPage() {
  const { addSender } = useCompanies();
  const { createCampaign, addRecipients, sendCampaign } = useCampaigns();
  const router = useRouter();

  const form = useForm<QuickSendFormValues>({
    resolver: zodResolver(quickSendSchema),
    defaultValues: { subject: "", bodyHtml: "", fromAddress: "", replyTo: "", recipients: "" },
  });

  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const bodyHtml = form.watch("bodyHtml");
  const recipientsRaw = form.watch("recipients");
  const sanitizedPreview =
    typeof window !== "undefined" ? DOMPurify.sanitize(bodyHtml || "") : "";
  const parsedRecipients = useMemo(() => parseRecipients(recipientsRaw || ""), [recipientsRaw]);

  async function handleSend(values: QuickSendFormValues) {
    setSendError(null);

    const recipients = parseRecipients(values.recipients);
    if (recipients.length === 0) {
      setSendError("Enter at least one recipient email");
      return;
    }

    setIsSending(true);
    try {
      // Registers this from-address the first time it's used — no separate
      // "add sender" step in Settings needed.
      await addSender(values.fromAddress);

      const campaign = await createCampaign({
        subject: values.subject,
        bodyHtml: values.bodyHtml,
        fromAddress: values.fromAddress,
        replyTo: values.replyTo || undefined,
      });

      const csv = `email\n${recipients.join("\n")}`;
      const uploadResult = await addRecipients(campaign.id, csv);

      if (uploadResult.inserted === 0) {
        setSendError(
          `No valid recipients to send to (${uploadResult.invalidEmail} invalid, ${uploadResult.duplicate} duplicate, ${uploadResult.suppressed} suppressed/unsubscribed).`,
        );
        setIsSending(false);
        return;
      }

      // The queue behind this sends every recipient one at a time under a
      // per-second rate limit, not all at once — pasting in a few hundred
      // emails here is safe, they go out gradually rather than in one burst.
      await sendCampaign(campaign.id);
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send");
      setIsSending(false);
    }
  }

  return (
    <DashboardLayout>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Resend</h1>
      <p className="mb-6 text-sm text-slate-600">
        Enter a from-address, subject, body, and recipients, and click Send. Domain and sender
        verification happens directly in your Resend dashboard — nothing to set up here first.
        For larger lists, use{" "}
        <Link href="/campaigns/new" className="font-medium underline">
          New campaign
        </Link>{" "}
        instead.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSend)} className="rounded-xl bg-white p-6 shadow">
          {sendError && <p className="mb-4 text-sm font-medium text-red-600">{sendError}</p>}

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="subject"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSending} placeholder="Your subject line" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fromAddress"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>From address</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      disabled={isSending}
                      placeholder="info@yourcompany.com"
                    />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="replyTo"
              render={({ field, fieldState }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Reply-To (optional, defaults to from address)</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSending} placeholder="replies@yourcompany.com" />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="bodyHtml"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Email body (HTML)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      disabled={isSending}
                      rows={12}
                      className="font-mono text-xs"
                      placeholder="<p>Hi there, ...</p>"
                    />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />

            <div>
              <p className="mb-2 text-sm font-medium">Preview</p>
              <div
                className="h-[18rem] overflow-auto rounded-md border bg-white p-4 text-sm"
                // Sanitized with DOMPurify above — never render raw bodyHtml here.
                dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
              />
            </div>
          </div>

          <div className="mt-4">
            <FormField
              control={form.control}
              name="recipients"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Recipients</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      disabled={isSending}
                      rows={6}
                      placeholder={"one@client.com, two@client.com\nthree@client.com"}
                    />
                  </FormControl>
                  <p className="mt-1 text-xs text-slate-500">
                    Separate addresses with commas, spaces, or new lines.{" "}
                    {parsedRecipients.length > 0 &&
                      `${parsedRecipients.length} address${parsedRecipients.length === 1 ? "" : "es"} detected.`}
                  </p>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" className="mt-6" disabled={isSending}>
            {isSending ? "Sending..." : "Send"}
          </Button>
        </form>
      </Form>
    </DashboardLayout>
  );
}
