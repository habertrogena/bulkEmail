"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { DkimRecordsTable } from "@/components/settings/DkimRecordsTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { domainSchema, DomainFormValues, senderSchema, SenderFormValues } from "@/validation/domain.schema";
import type { CompanyProfile } from "@/interface/company";

export default function DomainSettingsPage() {
  const { isAuthLoading } = useAuth();
  const { getProfile, addDomain, getDomainStatus, addSender } = useCompanies();

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    if (isAuthLoading) return;
    getProfile()
      .then(setProfile)
      .catch((err: unknown) =>
        setLoadError(err instanceof Error ? err.message : "Failed to load company settings"),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading]);

  const domainForm = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema),
    defaultValues: { domain: "" },
  });
  const [domainServerError, setDomainServerError] = useState<string | null>(null);

  async function onSubmitDomain(values: DomainFormValues) {
    setDomainServerError(null);
    try {
      const result = await addDomain(values.domain);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              sendingDomain: result.domain,
              domainVerified: false,
              dkimTokens: result.dkimTokens,
              instructions: result.instructions,
            }
          : prev,
      );
    } catch (err) {
      setDomainServerError(err instanceof Error ? err.message : "Failed to add domain");
    }
  }

  async function handleCheckStatus() {
    setCheckingStatus(true);
    try {
      const status = await getDomainStatus();
      setProfile((prev) => (prev ? { ...prev, ...status } : prev));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to check domain status");
    } finally {
      setCheckingStatus(false);
    }
  }

  const senderForm = useForm<SenderFormValues>({
    resolver: zodResolver(senderSchema),
    defaultValues: { address: "" },
  });
  const [senderServerError, setSenderServerError] = useState<string | null>(null);

  async function onSubmitSender(values: SenderFormValues) {
    setSenderServerError(null);

    if (
      profile?.domainVerified &&
      profile.sendingDomain &&
      !values.address.toLowerCase().endsWith(`@${profile.sendingDomain.toLowerCase()}`)
    ) {
      senderForm.setError("address", {
        message: `Address must end in @${profile.sendingDomain}`,
      });
      return;
    }

    try {
      const result = await addSender(values.address);
      setProfile((prev) => (prev ? { ...prev, approvedSenders: result.approvedSenders } : prev));
      senderForm.reset();
    } catch (err) {
      setSenderServerError(err instanceof Error ? err.message : "Failed to add sender");
    }
  }

  if (isAuthLoading || (!profile && !loadError)) return <LoadingPage />;

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Sending domain</h1>

      {loadError && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700">
          {loadError}
        </div>
      )}

      {profile && (
        <div className="space-y-6">
          {!profile.sendingDomain ? (
            <div className="rounded-xl bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold">Add your sending domain</h2>
              <Form {...domainForm}>
                <form
                  onSubmit={domainForm.handleSubmit(onSubmitDomain)}
                  className="flex items-start gap-3"
                >
                  {domainServerError && (
                    <p className="w-full text-sm font-medium text-red-600">{domainServerError}</p>
                  )}
                  <FormField
                    control={domainForm.control}
                    name="domain"
                    render={({ field, fieldState }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Domain</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="mail.yourcompany.com" />
                        </FormControl>
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="mt-6"
                    disabled={domainForm.formState.isSubmitting}
                  >
                    {domainForm.formState.isSubmitting ? "Adding..." : "Add domain"}
                  </Button>
                </form>
              </Form>
            </div>
          ) : (
            <div className="rounded-xl bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{profile.sendingDomain}</h2>
                  <Badge variant={profile.domainVerified ? "success" : "warning"}>
                    {profile.domainVerified ? "Verified" : "Pending verification"}
                  </Badge>
                </div>
                {!profile.domainVerified && (
                  <Button variant="outline" onClick={handleCheckStatus} disabled={checkingStatus}>
                    {checkingStatus ? "Checking..." : "Check again"}
                  </Button>
                )}
              </div>

              {!profile.domainVerified && (
                <>
                  <p className="mb-3 text-sm text-slate-600">
                    Add these CNAME records at your DNS provider to verify this domain:
                  </p>
                  <DkimRecordsTable instructions={profile.instructions} />
                </>
              )}
            </div>
          )}

          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">Approved senders</h2>

            {profile.approvedSenders.length > 0 ? (
              <ul className="mb-4 space-y-1 text-sm text-slate-700">
                {profile.approvedSenders.map((sender) => (
                  <li key={sender} className="font-mono">
                    {sender}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-slate-500">No approved senders yet.</p>
            )}

            <Form {...senderForm}>
              <form
                onSubmit={senderForm.handleSubmit(onSubmitSender)}
                className="flex items-start gap-3"
              >
                {senderServerError && (
                  <p className="w-full text-sm font-medium text-red-600">{senderServerError}</p>
                )}
                <FormField
                  control={senderForm.control}
                  name="address"
                  render={({ field, fieldState }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Add sender address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="info@yourcompany.com" />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="mt-6"
                  disabled={senderForm.formState.isSubmitting}
                >
                  {senderForm.formState.isSubmitting ? "Adding..." : "Add sender"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
