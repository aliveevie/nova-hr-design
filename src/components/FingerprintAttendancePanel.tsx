import { useEffect, useState } from "react";
import { Fingerprint, UserPlus, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { fingerprintApi, getFingerprintErrorCode } from "@/lib/api/fingerprint.api";
import {
  captureFingerprintImage,
  listReaders,
  FingerprintReaderError,
  LITE_CLIENT_DOWNLOAD_URL,
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
  const [logs, setLogs] = useState<any[]>([]);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const available = Boolean(readerAvailable && matcherAvailable);

  const load = async () => {
    // Reader lives in the browser (DigitalPersona client); matcher lives on the
    // backend. Check both independently.
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

    try {
      const logRes = await fingerprintApi.listAttendanceLogs(today);
      setLogs(logRes.logs);
    } catch {
      /* logs are non-critical */
    }
  };

  useEffect(() => {
    load();
    const interval = window.setInterval(() => load(), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const scan = async () => {
    setScanning(true);
    try {
      const { imageB64 } = await captureFingerprintImage();
      const result = await fingerprintApi.scanAttendance({ imageB64 });
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
        toast({
          title: "Reader problem",
          description: e.message,
          variant: "destructive",
        });
        return;
      }
      const code = getFingerprintErrorCode(e);
      if (code === "UNKNOWN_FINGERPRINT" || code === "NO_ENROLLMENTS") {
        setEnrollOpen(true);
        toast({
          title: "Unknown fingerprint",
          description: "Select the employee and register this finger using the guided steps.",
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
          {needsClient && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
              <p>
                To use the fingerprint reader on this device, install the free DigitalPersona
                client once, then plug in the reader and reload this page.
              </p>
              <Button asChild variant="outline" size="sm">
                <a href={LITE_CLIENT_DOWNLOAD_URL} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download DigitalPersona client
                </a>
              </Button>
            </div>
          )}
          {!needsClient && readerAvailable === false && (
            <p className="text-sm text-destructive">
              No fingerprint reader detected on this device. Plug in the reader and reload.
            </p>
          )}
          {matcherAvailable === false && (
            <p className="text-sm text-destructive">
              Server fingerprint engine is unavailable. Contact your administrator.
            </p>
          )}
          {available && (
            <p className="text-sm text-muted-foreground">Reader ready on this device.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={scan} disabled={!available || scanning} size="lg">
              {scanning ? "Place finger on reader now…" : "Scan fingerprint for attendance"}
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

          {logs.length > 0 && (
            <div className="pt-4">
              <h4 className="text-sm font-medium mb-2">Today&apos;s fingerprint scans</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{new Date(l.createdAt).toLocaleTimeString()}</TableCell>
                      <TableCell>{l.employeeName || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{l.eventType}</Badge>
                      </TableCell>
                      <TableCell>{l.matchScore != null ? l.matchScore.toFixed(2) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
