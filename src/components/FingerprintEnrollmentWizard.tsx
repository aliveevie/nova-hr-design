import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Fingerprint,
  ChevronRight,
  Loader2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  fingerprintApi,
  getFingerprintErrorCode,
  RecommendedFinger,
  EnrollmentOverviewEmployee,
  FingerprintTemplate,
} from "@/lib/api/fingerprint.api";
import {
  captureFingerprintImage,
  listReaders,
  FingerprintReaderError,
  LITE_CLIENT_DOWNLOAD_URL,
} from "@/lib/fingerprintReader";

type Props = {
  /** When set, skip employee picker (e.g. Employee detail tab). */
  employeeId?: string;
  employeeName?: string;
  /** Controlled open for modal usage. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onComplete?: () => void;
  /** Show inline (no dialog wrapper). */
  variant?: "inline" | "dialog";
  title?: string;
};

type WizardStep = "pick-employee" | "enroll" | "done";

export const FingerprintEnrollmentWizard = ({
  employeeId: presetEmployeeId,
  employeeName: presetEmployeeName,
  open,
  onOpenChange,
  onComplete,
  variant = "inline",
  title = "Fingerprint enrollment",
}: Props) => {
  const { toast } = useToast();
  const [readerAvailable, setReaderAvailable] = useState<boolean | null>(null);
  const [matcherAvailable, setMatcherAvailable] = useState<boolean | null>(null);
  const [needsClient, setNeedsClient] = useState(false);
  const [overview, setOverview] = useState<EnrollmentOverviewEmployee[]>([]);
  const [recommended, setRecommended] = useState<RecommendedFinger[]>([]);
  const [maxFingers, setMaxFingers] = useState(3);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(presetEmployeeId || "");
  const [templates, setTemplates] = useState<FingerprintTemplate[]>([]);
  const [nextFinger, setNextFinger] = useState<RecommendedFinger | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<WizardStep>(presetEmployeeId ? "enroll" : "pick-employee");
  const [lastSuccess, setLastSuccess] = useState<string | null>(null);

  const selectedEmployee = useMemo(() => {
    if (presetEmployeeId) {
      return {
        employeeId: presetEmployeeId,
        name: presetEmployeeName || "Employee",
        department: "",
        enrolledFingers: templates.length,
        maxFingers,
        isFullyEnrolled: templates.length >= maxFingers,
        enrolledPositions: templates.map((t) => t.fingerPosition),
      };
    }
    return overview.find((e) => e.employeeId === selectedEmployeeId) ?? null;
  }, [presetEmployeeId, presetEmployeeName, overview, selectedEmployeeId, templates, maxFingers]);

  const scannerAvailable =
    readerAvailable === null || matcherAvailable === null
      ? null
      : readerAvailable && matcherAvailable;

  const loadScanner = async () => {
    try {
      const readers = await listReaders();
      setReaderAvailable(readers.length > 0);
      setNeedsClient(false);
    } catch (e) {
      setReaderAvailable(false);
      if (e instanceof FingerprintReaderError && e.code === "NO_CLIENT") setNeedsClient(true);
    }
    try {
      const status = await fingerprintApi.getStatus();
      setMatcherAvailable(status.available);
    } catch {
      setMatcherAvailable(false);
    }
  };

  const loadOverview = async () => {
    const data = await fingerprintApi.getEnrollmentOverview();
    setOverview(data.employees);
    setRecommended(data.recommendedFingers);
    setMaxFingers(data.maxFingers);
  };

  const loadEmployeeTemplates = useCallback(async (empId: string) => {
    const data = await fingerprintApi.listEmployeeTemplates(empId);
    setTemplates(data.templates);
    setMaxFingers(data.maxFingers);
    const next = data.recommendedFingers.find(
      (f) => !data.templates.some((t) => t.fingerPosition === f.value)
    );
    setNextFinger(
      next
        ? { ...next }
        : data.nextRecommendedFinger
        ? {
            value: data.nextRecommendedFinger,
            label: data.nextRecommendedLabel || data.nextRecommendedFinger,
            step: data.enrolledCount + 1,
            hint: data.nextRecommendedHint || "Place the finger on the scanner.",
          }
        : null
    );
    if (data.isFullyEnrolled) setStep("done");
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      await loadScanner();
      if (!presetEmployeeId) await loadOverview();
      const empId = presetEmployeeId || selectedEmployeeId;
      if (empId) await loadEmployeeTemplates(empId);
    } catch (e: any) {
      toast({
        title: "Could not load enrollment data",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (variant === "dialog" && open === false) return;
    refresh();
  }, [open, presetEmployeeId]);

  useEffect(() => {
    if (selectedEmployeeId && !presetEmployeeId) {
      loadEmployeeTemplates(selectedEmployeeId).catch(() => {});
      setStep("enroll");
    }
  }, [selectedEmployeeId, presetEmployeeId, loadEmployeeTemplates]);

  const enrollNext = async () => {
    const empId = presetEmployeeId || selectedEmployeeId;
    if (!empId || !nextFinger) return;

    setEnrolling(true);
    setLastSuccess(null);
    try {
      const { imageB64, dpi } = await captureFingerprintImage({
        onQuality: (hint) => {
          if (hint) toast({ title: "Adjust finger", description: hint });
        },
      });
      const res = await fingerprintApi.enrollEmployee(empId, {
        fingerPosition: nextFinger.value,
        imageB64,
        dpi,
      });
      setLastSuccess(res.fingerLabel || nextFinger.label);
      toast({
        title: "Fingerprint registered",
        description: res.message,
      });
      await loadEmployeeTemplates(empId);
      if (!presetEmployeeId) await loadOverview();
      if (res.isFullyEnrolled) {
        setStep("done");
        onComplete?.();
      }
    } catch (e: any) {
      if (e instanceof FingerprintReaderError) {
        if (e.code === "NO_CLIENT") setNeedsClient(true);
        toast({
          title: "Reader problem",
          description: e.message,
          variant: "destructive",
        });
        return;
      }
      const code = getFingerprintErrorCode(e);
      if (code === "FINGERPRINT_ALREADY_TAKEN") {
        toast({
          title: "Fingerprint already taken",
          description: e.message || "This finger is already registered to another employee.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Enrollment failed",
        description: e.message || "Keep the finger on the reader until capture completes.",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  const enrolledCount = templates.length;
  const progressPct = Math.round((enrolledCount / maxFingers) * 100);

  const content = (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Fingerprint className="h-4 w-4 text-primary" />
        {scannerAvailable === null && <span className="text-muted-foreground">Checking reader…</span>}
        {scannerAvailable === true && <span className="text-success">Reader ready on this device</span>}
        {scannerAvailable === false && matcherAvailable === false && (
          <span className="text-destructive">Server fingerprint engine unavailable.</span>
        )}
        {scannerAvailable === false && matcherAvailable !== false && !needsClient && (
          <span className="text-destructive">No fingerprint reader detected on this device.</span>
        )}
      </div>

      {needsClient && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
          <p>
            Install the free DigitalPersona client once on this device, then plug in the reader and
            reload this page to enroll fingerprints.
          </p>
          <Button asChild variant="outline" size="sm">
            <a href={LITE_CLIENT_DOWNLOAD_URL} target="_blank" rel="noreferrer">
              Download DigitalPersona client
            </a>
          </Button>
        </div>
      )}

      {step === "pick-employee" && !presetEmployeeId && (
        <div className="space-y-3">
          <Label>Select employee to register</Label>
          <p className="text-sm text-muted-foreground">
            Each employee can enroll up to {maxFingers} fingers (index, thumb, and one backup).
            Employees who already have {maxFingers} prints are marked as complete.
          </p>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an employee…" />
            </SelectTrigger>
            <SelectContent>
              {overview.map((e) => (
                <SelectItem key={e.employeeId} value={e.employeeId} disabled={e.isFullyEnrolled}>
                  {e.name}
                  {e.department ? ` · ${e.department}` : ""}
                  {e.isFullyEnrolled ? " (complete)" : ` (${e.enrolledFingers}/${e.maxFingers})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedEmployee && !selectedEmployee.isFullyEnrolled && (
            <Button className="w-full" onClick={() => setStep("enroll")}>
              Continue with {selectedEmployee.name}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      )}

      {(step === "enroll" || step === "done") && selectedEmployee && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{selectedEmployee.name}</p>
              {selectedEmployee.department && (
                <p className="text-sm text-muted-foreground">{selectedEmployee.department}</p>
              )}
            </div>
            <Badge variant={step === "done" ? "default" : "secondary"}>
              {enrolledCount}/{maxFingers} fingers
            </Badge>
          </div>

          <Progress value={progressPct} className="h-2" />

          <div className="grid gap-2 sm:grid-cols-3">
            {recommended.map((f) => {
              const done = templates.some((t) => t.fingerPosition === f.value);
              return (
                <div
                  key={f.value}
                  className={`rounded-lg border p-3 text-sm ${
                    done ? "border-success/40 bg-success/5" : nextFinger?.value === f.value ? "border-primary ring-1 ring-primary/30" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    ) : (
                      <span className="text-xs text-muted-foreground w-4">{f.step}.</span>
                    )}
                    {f.label}
                  </div>
                </div>
              );
            })}
          </div>

          {step === "done" ? (
            <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-success mx-auto" />
              <p className="font-medium">Enrollment complete</p>
              <p className="text-sm text-muted-foreground">
                {selectedEmployee.name} can now use any of the {maxFingers} enrolled fingers for
                attendance between 9:00 AM and 5:00 PM.
              </p>
            </div>
          ) : nextFinger ? (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="text-sm font-medium">
                Step {nextFinger.step} of {maxFingers}: {nextFinger.label}
              </p>
              <p className="text-sm text-muted-foreground">{nextFinger.hint}</p>
              {lastSuccess && (
                <p className="text-sm text-success flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {lastSuccess} saved successfully.
                </p>
              )}
              <Button
                className="w-full"
                size="lg"
                disabled={!scannerAvailable || enrolling || loading}
                onClick={enrollNext}
              >
                {enrolling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Place finger on reader now…
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-4 w-4 mr-2" />
                    Capture {nextFinger.label}
                  </>
                )}
              </Button>
              {enrolledCount > 0 && enrolledCount < maxFingers && (
                <p className="text-xs text-center text-muted-foreground">
                  After success, you will be guided to register the next finger.
                </p>
              )}
            </div>
          ) : null}

          {templates.length > 0 && (
            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <p className="font-medium text-foreground">Enrolled prints</p>
              {templates.map((t) => (
                <p key={t.id}>
                  {t.fingerPosition} · {new Date(t.enrolledAt).toLocaleString()}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      )}
    </div>
  );

  if (variant === "dialog") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {title}
            </DialogTitle>
            <DialogDescription>
              Register up to 3 fingerprints per employee. Unknown scans at the kiosk will prompt
              enrollment here.
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return content;
};
