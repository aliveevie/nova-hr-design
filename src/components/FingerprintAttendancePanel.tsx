import { useEffect, useState } from "react";
import { Fingerprint, UserPlus, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fingerprintApi, getFingerprintErrorCode } from "@/lib/api/fingerprint.api";
import {
  captureFingerprintImage,
  getReaderInfo,
  listReaders,
  FingerprintReaderError,
  LITE_CLIENT_DOWNLOAD_URL,
  NON_WBF_DRIVER_URL,
  type ReaderInfo,
} from "@/lib/fingerprintReader";
import { FingerprintEnrollmentWizard } from "@/components/FingerprintEnrollmentWizard";

type Props = {
  onScanComplete?: () => void;
};

export const FingerprintAttendancePanel = ({ onScanComplete }: Props) => {
  const { toast } = useToast();
  const [readerAvailable, setReaderAvailable] = useState<boolean | null>(null);
  const [matcherAvailable, setMatcherAvailable] = useState<boolean | null>(null);
  const [needsClient, setNeedsClient] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanHint, setScanHint] = useState<string | null>(null);
  const [readerInfo, setReaderInfo] = useState<ReaderInfo | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);

  const available = Boolean(readerAvailable && matcherAvailable);

  const load = async () => {
    // Reader lives in the browser (DigitalPersona client); matcher lives on the
    // backend. Check both independently.
    try {
      const readers = await listReaders();
      setReaderAvailable(readers.length > 0);
      setNeedsClient(false);
      if (readers.length > 0) {
        setReaderInfo(await getReaderInfo());
      } else {
        setReaderInfo(null);
      }
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

  useEffect(() => {
    load();
    const interval = window.setInterval(() => load(), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const scan = async () => {
    setScanning(true);
    setScanHint("Starting fingerprint reader…");
    try {
      const { imageB64, dpi } = await captureFingerprintImage({
        onQuality: (hint) => {
          if (hint) setScanHint(hint);
        },
        onStatus: (msg) => setScanHint(msg),
      });
      setScanHint(null);
      const result = await fingerprintApi.scanAttendance({ imageB64, dpi });
      const title = result.alreadyCheckedIn ? "Already checked in" : "Checked in";
      toast({
        title,
        description: `${result.employeeName} — ${result.message}`,
      });
      await load();
      onScanComplete?.();
    } catch (e: any) {
      if (e instanceof FingerprintReaderError) {
        if (e.code === "NO_CLIENT") setNeedsClient(true);
        if (e.code === "WBF_DRIVER") {
          toast({
            title: "Wrong fingerprint driver",
            description: e.message,
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Reader problem",
          description: e.message,
          variant: "destructive",
        });
        return;
      }
      const code = getFingerprintErrorCode(e);
      if (code === "NO_ENROLLMENTS") {
        setEnrollOpen(true);
        toast({
          title: "No fingerprints registered yet",
          description: "Register at least one employee fingerprint, then scan again.",
        });
        return;
      }
      if (code === "UNKNOWN_FINGERPRINT") {
        setEnrollOpen(true);
        toast({
          title: "Fingerprint not recognized",
          description:
            e.message ||
            "Scan a finger that was enrolled, or register this finger for an employee.",
        });
        return;
      }
      if (code === "ALREADY_CHECKED_OUT") {
        toast({
          title: "Already checked out",
          description: e.message || "You are already signed out for today.",
          variant: "destructive",
        });
        return;
      }
      if (code === "OUTSIDE_HOURS") {
        toast({
          title: "Outside office hours",
          description: e.message || "Attendance is only open during office hours.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Scan failed",
        description: e.message || "Could not process fingerprint",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
      setScanHint(null);
    }
  };

  return (
    <>
      <Card className="shadow-sm border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Fingerprint attendance
          </CardTitle>
          <CardDescription>
            Scan any enrolled finger during office hours to check in. Sign-out happens
            automatically at close time. Unknown fingers open enrollment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-blue-200 bg-blue-50/80 p-3 text-sm text-blue-950 space-y-2">
            <p className="font-medium">Windows scanner setup (one-time per PC)</p>
            <p className="text-blue-900/90">
              Install the Lite Client, then the DigitalPersona driver below. If the reader lights up
              but the website never captures your finger, the wrong driver (Windows Hello / WBF) is
              usually installed — use the non-WBF driver link and reboot.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={LITE_CLIENT_DOWNLOAD_URL} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Lite Client
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={NON_WBF_DRIVER_URL} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  U.are.U driver (non-WBF)
                </a>
              </Button>
            </div>
          </div>
          {needsClient && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
              <p>
                Install the free DigitalPersona client once on this Windows PC, then plug in the
                reader and reload.
              </p>
              <Button asChild variant="outline" size="sm">
                <a href={LITE_CLIENT_DOWNLOAD_URL} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download Lite Client
                </a>
              </Button>
            </div>
          )}
          {!needsClient && readerAvailable === false && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm space-y-2">
              <p className="text-destructive">
                No fingerprint reader detected. Plug in the reader and reload.
              </p>
              <p className="text-muted-foreground">
                If the reader works with Windows Hello but not here, you likely have the WBF
                driver. Install the{" "}
                <a href={NON_WBF_DRIVER_URL} target="_blank" rel="noreferrer" className="underline">
                  DigitalPersona non-WBF driver
                </a>{" "}
                instead, then reboot.
              </p>
            </div>
          )}
          {matcherAvailable === false && (
            <p className="text-sm text-destructive">
              Server fingerprint engine is unavailable. Contact your administrator.
            </p>
          )}
          {available && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Reader ready on this device.</p>
              {readerInfo && (
                <p className="text-xs">
                  Device: {String(readerInfo.details?.Name || readerInfo.deviceId)}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={scan} disabled={!available || scanning} size="lg">
              {scanning ? "Reading fingerprint…" : "Scan fingerprint for attendance"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setEnrollOpen(true)}
              disabled={!available}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Register new fingerprint
            </Button>
          </div>

          {scanning && scanHint && (
            <p className="text-sm text-primary font-medium">{scanHint}</p>
          )}
        </CardContent>
      </Card>

      <FingerprintEnrollmentWizard
        variant="dialog"
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        title="Register fingerprint"
        onComplete={() => {
          setEnrollOpen(false);
          load();
          onScanComplete?.();
        }}
      />
    </>
  );
};
