import { useEffect, useState } from "react";
import { Fingerprint, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { fingerprintApi, getFingerprintErrorCode } from "@/lib/api/fingerprint.api";
import { FingerprintEnrollmentWizard } from "@/components/FingerprintEnrollmentWizard";

type Props = {
  onScanComplete?: () => void;
};

export const FingerprintAttendancePanel = ({ onScanComplete }: Props) => {
  const { toast } = useToast();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const load = async () => {
    try {
      const [status, logRes] = await Promise.all([
        fingerprintApi.getStatus(),
        fingerprintApi.listAttendanceLogs(today),
      ]);
      setAvailable(status.available);
      setDeviceName(status.device_name ?? null);
      setLogs(logRes.logs);
    } catch {
      setAvailable(false);
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
      const result = await fingerprintApi.scanAttendance();
      const title = result.alreadyCheckedIn
        ? "Already checked in"
        : "Checked in";
      toast({
        title,
        description: `${result.employeeName} — ${result.message}`,
      });
      await load();
      onScanComplete?.();
    } catch (e: any) {
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
          description: e.message || "Attendance is open 9:00 AM – 5:00 PM.",
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
            Scan any enrolled finger between 9:00 AM and 5:00 PM to check in. Sign-out happens
            automatically at 5:00 PM. Unknown fingers open enrollment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {available === false && (
            <p className="text-sm text-destructive">
              Scanner not available — backend must run on the PC with the USB fingerprint reader attached.
            </p>
          )}
          {available && deviceName && (
            <p className="text-sm text-muted-foreground">Device: {deviceName}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={scan} disabled={!available || scanning} size="lg">
              {scanning ? "Scan finger now…" : "Scan fingerprint for attendance"}
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
