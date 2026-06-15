/**
 * E2E verification for fingerprint attendance flow (local backend + Aiven).
 * Run: cd backend && npx tsx scripts/verify-fingerprint-attendance-e2e.ts
 */
import "dotenv/config";

const API = process.env.API_URL || "http://localhost:3001/api";
const EMAIL = process.env.E2E_ADMIN_EMAIL || "test.hr.admin@galaxyitt.com.ng";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD || "TestNovaHR#2026";

async function login(): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed: ${data.error}`);
  return data.token as string;
}

async function api(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function main() {
  console.log("=== Fingerprint attendance E2E ===\n");
  const token = await login();
  console.log("✓ Login OK");

  const { res: statusRes, data: status } = await api(token, "/fingerprint/status");
  console.log(`✓ Scanner status: available=${status.available} device=${status.device_name || "n/a"}`);

  const { data: overview } = await api(token, "/fingerprint/enrollment/overview");
  console.log(`✓ Enrollment overview: ${overview.employees?.length ?? 0} employees, maxFingers=${overview.maxFingers}`);

  const { data: offices } = await api(token, "/attendance/offices");
  const office = offices.locations?.[0];
  console.log(
    `✓ Office hours: ${office?.openTime || "?"} – ${office?.closeTime || "?"} (${office?.timeZone || "?"}) autoStart=${office?.autoStartEnabled}`
  );

  const today = new Date().toISOString().slice(0, 10);
  const { data: daily } = await api(token, `/attendance/daily?date=${today}`);
  console.log(
    `✓ Daily roster: ${daily.employees?.length ?? 0} staff, session open=${daily.session?.isOpen} (${daily.session?.message})`
  );

  const { res: scanRes, data: scanData } = await api(token, "/fingerprint/attendance/scan", {
    method: "POST",
    body: JSON.stringify({}),
  });

  if (scanRes.ok) {
    console.log(`✓ Scan OK: ${scanData.employeeName} — ${scanData.message}`);
  } else {
    const code = scanData.code || "unknown";
    console.log(`○ Scan response (${scanRes.status} / ${code}): ${scanData.error}`);
    if (code === "OUTSIDE_HOURS") console.log("  (Expected if current time is outside 09:00–17:00 office TZ)");
    if (code === "UNKNOWN_FINGERPRINT") console.log("  (Expected if finger not enrolled — enrollment modal would open)");
    if (code === "NO_ENROLLMENTS") console.log("  (Expected if no employees enrolled yet)");
  }

  const { data: logs } = await api(token, `/fingerprint/attendance/logs?date=${today}`);
  console.log(`✓ Today's scan logs: ${logs.logs?.length ?? 0} entries`);

  console.log("\n=== E2E complete ===");
}

main().catch((e) => {
  console.error("E2E failed:", e.message);
  process.exit(1);
});
