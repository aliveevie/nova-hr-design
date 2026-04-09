import { useEffect, useLayoutEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";
import { EmployeeForm } from "@/components/forms/EmployeeForm";
import { Employee } from "@/types";
import { publicInviteApi } from "@/lib/api/publicInvite.api";
import {
  buildFriendlyValidationResult,
  extractConflictFieldFromApiError,
  extractValidationIssuesFromApiError,
  friendlyGenericSubmitError,
} from "@/lib/employeeValidationMessages";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const StaffOnboarding = () => {
  const { toast } = useToast();
  const { token } = useParams<{ token: string }>();
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  /** Server-side validation (Zod) — plain-language lines for the user */
  const [serverIssues, setServerIssues] = useState<string[]>([]);
  const [focusFieldId, setFocusFieldId] = useState<string | undefined>();
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);

  const getDeviceId = () => {
    const key = "onboarding_device_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(key, created);
    return created;
  };

  useLayoutEffect(() => {
    if (!focusFieldId || serverIssues.length === 0) return;
    const el = document.getElementById(focusFieldId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [serverIssues, focusFieldId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setChecking(false);
        setReason("missing");
        return;
      }
      try {
        const res = await publicInviteApi.validate(token);
        if (cancelled) return;
        if (res.valid) {
          setValid(true);
        } else {
          setReason(res.reason || "invalid");
        }
      } catch {
        if (!cancelled) setReason("invalid");
      } finally {
        if (!cancelled && token) {
          const cached = localStorage.getItem(`invite_email_${token}`);
          if (cached) setResendEmail(cached);
        }
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (data: Omit<Employee, "id" | "initials">) => {
    if (!token) return;
    setSubmitting(true);
    setServerIssues([]);
    setFocusFieldId(undefined);
    try {
      await publicInviteApi.submit(token, data as unknown as Record<string, unknown>);
      const email = String((data as any).email || "").trim().toLowerCase();
      if (email) {
        setResendEmail(email);
        localStorage.setItem(`invite_email_${token}`, email);
      }
      setSuccessOpen(true);
    } catch (e: unknown) {
      console.error(e);
      const err = e as Error & {
        details?: { error?: string; details?: unknown; code?: string; field?: string };
        status?: number;
      };
      const rawIssues = extractValidationIssuesFromApiError(err);
      const { lines, firstFieldId } = buildFriendlyValidationResult(rawIssues);
      if (lines.length > 0) {
        setServerIssues(lines);
        setFocusFieldId(firstFieldId);
        return;
      }
      const conflict = extractConflictFieldFromApiError(err);
      if (conflict) {
        setServerIssues([conflict.message]);
        setFocusFieldId(conflict.fieldId);
        return;
      }
      toast({
        title: "Could not submit",
        description: friendlyGenericSubmitError(err),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendWelcome = async () => {
    if (!token) return;
    const email = resendEmail.trim().toLowerCase();
    if (!email) {
      toast({
        title: "Email required",
        description: "Enter your onboarding email to resend login details.",
        variant: "destructive",
      });
      return;
    }
    try {
      setResending(true);
      await publicInviteApi.resendWelcome(token, {
        email,
        deviceId: getDeviceId(),
      });
      toast({
        title: "Email sent",
        description: "Welcome/login details were sent again. Check inbox/spam.",
      });
    } catch (e: any) {
      toast({
        title: "Resend failed",
        description: e?.message || "Could not resend email now. Try again shortly.",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0c0f14] text-zinc-100">
        <Loader2 className="h-10 w-10 animate-spin text-amber-400/90" />
        <p className="mt-4 text-sm text-zinc-400">Checking your invite…</p>
      </div>
    );
  }

  if (!valid || !token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0c0f14] px-4 text-center">
        <ShieldCheck className="h-12 w-12 text-red-400/90 mb-4" />
        <h1 className="text-xl font-semibold text-zinc-100">Invite unavailable</h1>
        <p className="mt-2 text-sm text-zinc-400 max-w-md">
          {reason === "expired"
            ? "This link has expired. Ask your HR admin for a new invite."
            : reason === "revoked"
              ? "This invite was revoked."
              : "This link is invalid or has already been used."}
        </p>
        <Button asChild className="mt-8" variant="secondary">
          <Link to="/login">Back to login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0f14] text-zinc-100">
      <div className="border-b border-white/5 bg-[#12161f]/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-[#0c0f14] font-bold text-sm">
            HR
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-400/90">Staff onboarding</p>
            <h1 className="text-lg font-semibold">Complete your profile</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <p className="text-sm text-zinc-400 mb-8 max-w-2xl">
          Enter your details exactly as they should appear on your HR record. When you submit, we will create
          your account and email login instructions to the address you provide. Use your
          {" "}@galaxyitt.com.ng email address.
        </p>

        <div className="relative rounded-2xl border border-zinc-200/90 bg-white p-6 md:p-8 shadow-xl text-zinc-900">
          {submitting ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/85 backdrop-blur-sm gap-3 text-zinc-800">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="font-medium">Creating your account…</span>
            </div>
          ) : null}
          {serverIssues.length > 0 ? (
            <Alert variant="destructive" className="mb-6 text-left border-red-200 bg-red-50/90 text-red-950">
              <AlertTitle className="text-red-900">Please update the following</AlertTitle>
              <AlertDescription className="text-red-900/90">
                <p className="text-sm mb-2">
                  Fix each point below, then press <strong>Submit profile</strong> again.
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm leading-snug">
                  {serverIssues.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}
          <EmployeeForm
            scrollMode="page"
            onSubmit={handleSubmit}
            onCancel={() => window.history.back()}
            onDismissServerErrors={() => {
              setServerIssues([]);
              setFocusFieldId(undefined);
            }}
            emailDomain="galaxyitt.com.ng"
            showCancel={false}
            submitLabel="Submit profile"
          />
          <div className="mt-6 rounded-lg border border-zinc-200 p-4">
            <p className="text-sm font-medium">Didn&apos;t receive your welcome email?</p>
            <p className="text-xs text-zinc-500 mt-1">
              Enter the same onboarding email and resend login details.
            </p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="your.name@galaxyitt.com.ng"
              />
              <Button type="button" variant="outline" onClick={handleResendWelcome} disabled={resending}>
                {resending ? "Sending..." : "Resend email"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-md border-white/10 bg-[#12161f] text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-xl">You&apos;re almost there</DialogTitle>
            <DialogDescription className="text-zinc-400 text-base leading-relaxed">
              Your profile was received. Login details have been sent to your email successfully. Continue to
              the sign-in page to access your employee dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button asChild className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-[#0c0f14]">
              <Link to="/login">Continue to login</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffOnboarding;
