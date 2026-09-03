"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DOMPurify from "dompurify";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { RecipientDropzone } from "@/components/campaigns/RecipientDropzone";
import { UploadResultSummary } from "@/components/campaigns/UploadResultSummary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoadingPage } from "@/components/ui/loading-spinner";
import { useAuth } from "@/context/useAuth";
import { useCompanies } from "@/hooks/useCompanies";
import { useCampaigns } from "@/hooks/useCampaigns";
import { campaignSchema, CampaignFormValues } from "@/validation/campaign.schema";
import type { AddRecipientsResponse } from "@/interface/campaign";

export default function NewCampaignPage() {
  const { isAuthLoading } = useAuth();
  const { getProfile } = useCompanies();
  const { createCampaign, addRecipients, sendCampaign, getCampaign } = useCampaigns();
  const router = useRouter();

  const [approvedSenders, setApprovedSenders] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    getProfile()
      .then((profile) => setApprovedSenders(profile.approvedSenders))
      .catch((err: unknown) =>
        setLoadError(err instanceof Error ? err.message : "Failed to load senders"),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading]);

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { subject: "", bodyHtml: "", fromAddress: "", replyTo: "" },
  });

  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<AddRecipientsResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const bodyHtml = form.watch("bodyHtml");
  const sanitizedPreview =
    typeof window !== "undefined" ? DOMPurify.sanitize(bodyHtml || "") : "";

  async function handleSaveDraft(values: CampaignFormValues) {
    setSaveError(null);
    try {
      const campaign = await createCampaign({
        subject: values.subject,
        bodyHtml: values.bodyHtml,
        fromAddress: values.fromAddress,
        replyTo: values.replyTo || undefined,
      });
      setCampaignId(campaign.id);
      setTotalCount(campaign.totalCount);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save draft");
    }
  }

  async function handleCsv(csv: string) {
    if (!campaignId) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const result = await addRecipients(campaignId, csv);
      setUploadResult(result);
      const campaign = await getCampaign(campaignId);
      setTotalCount(campaign.totalCount);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload recipients");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSend() {
    if (!campaignId) return;
    setSendError(null);
    setIsSending(true);
    try {
      await sendCampaign(campaignId);
      router.push(`/campaigns/${campaignId}`);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send campaign");
      setIsSending(false);
    }
  }

  if (isAuthLoading || approvedSenders === null) {
    if (loadError) {
      return (
        <DashboardLayout>
          <div className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700">
            {loadError}
          </div>
        </DashboardLayout>
      );
    }
    return <LoadingPage />;
  }

  const isDraftSaved = campaignId !== null;
  const canSend =
    isDraftSaved && totalCount > 0 && !form.formState.isSubmitting && !isSending;
  const sendDisabledReason = !isDraftSaved
    ? "Save the draft first"
    : totalCount === 0
      ? "Upload at least one recipient before sending"
      : null;

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">New campaign</h1>

      {approvedSenders.length === 0 && (
        <div className="mb-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          You don&apos;t have any approved sender addresses yet.{" "}
          <Link href="/settings/domain" className="font-medium underline">
            Set up your sending domain
          </Link>{" "}
          before composing a campaign.
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSaveDraft)}
          className="mb-6 rounded-xl bg-white p-6 shadow"
        >
          {saveError && (
            <p className="mb-4 text-sm font-medium text-red-600">{saveError}</p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="subject"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isDraftSaved} placeholder="Your subject line" />
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isDraftSaved || approvedSenders.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a sender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {approvedSenders.map((sender) => (
                        <SelectItem key={sender} value={sender}>
                          {sender}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Input {...field} disabled={isDraftSaved} placeholder="replies@yourcompany.com" />
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
                      disabled={isDraftSaved}
                      rows={14}
                      className="font-mono text-xs"
                      placeholder="<p>Hi {{first_name}}, ...</p>"
                    />
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />

            <div>
              <p className="mb-2 text-sm font-medium">Preview</p>
              <div
                className="h-[21.5rem] overflow-auto rounded-md border bg-white p-4 text-sm"
                // Sanitized with DOMPurify above — never render raw bodyHtml here.
                dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
              />
            </div>
          </div>

          {!isDraftSaved && (
            <Button
              type="submit"
              className="mt-4"
              disabled={form.formState.isSubmitting || approvedSenders.length === 0}
            >
              {form.formState.isSubmitting ? "Saving..." : "Save as draft"}
            </Button>
          )}
          {isDraftSaved && (
            <p className="mt-4 text-sm text-slate-500">
              Draft saved. Fields above are locked — subject/body edits after saving aren&apos;t
              supported yet.
            </p>
          )}
        </form>
      </Form>

      <div className="mb-6 rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">Recipients</h2>
        <RecipientDropzone
          onFile={handleCsv}
          disabled={!isDraftSaved}
          isUploading={isUploading}
        />
        {uploadError && (
          <p className="mt-3 text-sm font-medium text-red-600">{uploadError}</p>
        )}
        {uploadResult && (
          <div className="mt-3">
            <UploadResultSummary result={uploadResult} />
          </div>
        )}
        <p className="mt-3 text-sm text-slate-600">
          Total recipients on this campaign: <strong>{totalCount}</strong>
        </p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        {sendError && (
          <p className="mb-3 text-sm font-medium text-red-600">{sendError}</p>
        )}
        <Button onClick={handleSend} disabled={!canSend}>
          {isSending ? "Sending..." : "Send campaign"}
        </Button>
        {sendDisabledReason && (
          <p className="mt-2 text-sm text-slate-500">{sendDisabledReason}</p>
        )}
      </div>
    </DashboardLayout>
  );
}
