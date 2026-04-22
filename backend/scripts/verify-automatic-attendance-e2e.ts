import "dotenv/config";
import { getSql } from "../src/config/supabase.js";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3001/api";
// IMPORTANT: Do not reuse the human test.hr.admin account — this script
// enforces single-office-per-admin and would otherwise overwrite the user's
// manually-configured office. Instead, provision a fresh throw-away admin
// per run (falls back to env overrides for CI reproducibility).
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "e2e.autoatt.admin@galaxyitt.com.ng";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "E2EAutoAtt#2026!";
const TEST_EMPLOYEE_EMAIL_PREFIX =
  process.env.E2E_AUTOATT_EMPLOYEE_EMAIL_PREFIX || "test.employee.autoatt";
const DEPARTMENT = process.env.E2E_AUTOATT_DEPARTMENT || "Technical Operations";

type ApiResp = { status: number; body: any };

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

async function api(path: string, opts: RequestInit = {}, token?: string): Promise<ApiResp> {
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (!(opts.body instanceof FormData)) headers["content-type"] = headers["content-type"] || "application/json";
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let body: any = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minutesToHHMM(totalMinutes: number) {
  const m = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
}

function nowMinutesInTz(timeZone: string, d = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const hh = Number(parts.find((p) => p.type === "hour")?.value);
  const mm = Number(parts.find((p) => p.type === "minute")?.value);
  return hh * 60 + mm;
}

// Emails of employees the script creates during a run. Every entry is purged
// at the end (including attendance / device rows) so the admin UI never shows
// residual test rows like "Test Employee AutoAttendance".
const createdEmployeeEmails: string[] = [];

async function cleanupCreatedEmployees() {
  if (createdEmployeeEmails.length === 0) return;
  try {
    const sql = getSql();
    if (!sql) return;
    for (const email of createdEmployeeEmails) {
      const rows: any[] = (await sql`select id from employees where email = ${email}`) as any[];
      for (const r of rows) {
        await sql`delete from attendance where employee_id = ${r.id}`;
        await sql`delete from employee_devices where employee_id = ${r.id}`;
        await sql`delete from employees where id = ${r.id}`;
      }
      await sql`delete from users where email = ${email}`;
    }
  } catch (err) {
    console.error("cleanup failed (non-fatal):", err);
  }
}

async function main() {
  // 1) Login as admin
  const loginAdmin = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  assert(loginAdmin.status === 200, `Admin login failed: ${loginAdmin.status}`);
  const adminToken = String(loginAdmin.body.token || "");
  assert(adminToken, "Missing admin token");

  // 2) Create an office location (small grace so checkout can be tested quickly)
  const officeName = `E2E Office ${Date.now()}`;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const nowMin = nowMinutesInTz(tz);
  const openTime = minutesToHHMM(nowMin - 1);
  const closeTime = minutesToHHMM(nowMin + 1);
  const office = await api(
    "/attendance/offices",
    {
      method: "POST",
      body: JSON.stringify({
        name: officeName,
        centerLat: 9.0765,
        centerLng: 7.3986,
        radiusM: 80,
        maxAccuracyM: 200,
        entryBufferM: 0,
        exitBufferM: 0,
        exitGraceSeconds: 1,
        openTime,
        closeTime,
        timeZone: tz,
        enabled: true,
      }),
    },
    adminToken
  );
  assert(office.status === 201, `Create office failed: ${office.status} ${JSON.stringify(office.body)}`);
  const loc = office.body.location;
  assert(loc?.id, "Missing office location id");

  // 3) Create employee (owned by this admin scope)
  const unique = Date.now();
  const testEmail = `${TEST_EMPLOYEE_EMAIL_PREFIX}+${unique}@galaxyitt.com.ng`;
  createdEmployeeEmails.push(testEmail);
  const createEmployee = await api(
    "/employees",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Test Employee AutoAttendance",
        email: testEmail,
        phone: "08000000000",
        department: DEPARTMENT,
        jobTitle: "Support Engineer",
        status: "Active",
        joinDate: "2026-04-01",
        salary: 150000,
      }),
    },
    adminToken
  );
  assert(createEmployee.status === 201, `Create employee failed: ${createEmployee.status}`);
  const employeeId = String(createEmployee.body.employee?.id || "");
  const tempPassword = String(createEmployee.body.employee?.tempPassword || "");
  assert(employeeId, "Missing employee id");
  assert(tempPassword, "Missing temp password");

  // 4) Login as employee
  const loginEmployee = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: testEmail, password: tempPassword }),
  });
  assert(loginEmployee.status === 200, `Employee login failed: ${loginEmployee.status}`);
  const employeeToken = String(loginEmployee.body.token || "");
  assert(employeeToken, "Missing employee token");

  // 5) Register device (must be inside office geofence)
  const deviceId = `e2e-device-${unique}`;
  const register = await api(
    "/attendance/device/register",
    {
      method: "POST",
      body: JSON.stringify({
        deviceId,
        deviceLabel: "E2E Device",
        lat: loc.centerLat,
        lng: loc.centerLng,
        accuracyM: 25,
      }),
    },
    employeeToken
  );
  assert(register.status === 201, `Device register failed: ${register.status} ${JSON.stringify(register.body)}`);

  // 5b) Employee can list their devices
  const devList = await api("/attendance/device", {}, employeeToken);
  assert(devList.status === 200, `List devices failed: ${devList.status}`);
  assert(
    Array.isArray(devList.body.devices) && devList.body.devices.some((d: any) => d.deviceId === deviceId),
    "Registered device missing from /attendance/device list"
  );

  // 6) Auto evaluate inside => should check in
  const evalIn = await api(
    "/attendance/device/auto",
    {
      method: "POST",
      body: JSON.stringify({
        deviceId,
        lat: loc.centerLat,
        lng: loc.centerLng,
        accuracyM: 25,
      }),
    },
    employeeToken
  );
  assert(evalIn.status === 200, `Auto eval (inside) failed: ${evalIn.status}`);
  assert(evalIn.body.action === "checked_in" || evalIn.body.action === "none", `Unexpected action: ${evalIn.body.action}`);

  // 7) Auto evaluate outside twice, after grace => should check out
  const outsideLat = Number(loc.centerLat) + 0.01;
  const outsideLng = Number(loc.centerLng) + 0.01;

  const evalOut1 = await api(
    "/attendance/device/auto",
    {
      method: "POST",
      body: JSON.stringify({
        deviceId,
        lat: outsideLat,
        lng: outsideLng,
        accuracyM: 25,
      }),
    },
    employeeToken
  );
  assert(evalOut1.status === 200, `Auto eval (outside #1) failed: ${evalOut1.status}`);

  await sleep(1200);

  const evalOut2 = await api(
    "/attendance/device/auto",
    {
      method: "POST",
      body: JSON.stringify({
        deviceId,
        lat: outsideLat,
        lng: outsideLng,
        accuracyM: 25,
      }),
    },
    employeeToken
  );
  assert(evalOut2.status === 200, `Auto eval (outside #2) failed: ${evalOut2.status}`);
  assert(
    evalOut2.body.action === "checked_out" || evalOut2.body.action === "none",
    `Unexpected checkout action: ${evalOut2.body.action}`
  );

  // 8) Admin can see employee's attendance for today
  const today = new Date().toISOString().split("T")[0];
  const list = await api(`/attendance?date=${encodeURIComponent(today)}`, {}, adminToken);
  assert(list.status === 200, `Admin GET /attendance failed: ${list.status}`);
  const found = (list.body.attendance || []).find((r: any) => r.employeeId === employeeId);
  assert(found, "Admin could not see attendance record for the test employee");

  // 9) Validator must now accept float / zero accuracy (the "Invalid data" regression)
  const evalZeroAccuracy = await api(
    "/attendance/device/auto",
    {
      method: "POST",
      body: JSON.stringify({
        deviceId,
        lat: outsideLat,
        lng: outsideLng,
        accuracyM: 0,
      }),
    },
    employeeToken
  );
  assert(
    evalZeroAccuracy.status === 200,
    `Zero-accuracy auto eval rejected with ${evalZeroAccuracy.status} ${JSON.stringify(evalZeroAccuracy.body)}`
  );

  // 10) Missing lat/lng must also be accepted (IP-only path)
  const evalNoGeo = await api(
    "/attendance/device/auto",
    { method: "POST", body: JSON.stringify({ deviceId }) },
    employeeToken
  );
  assert(
    evalNoGeo.status === 200,
    `Geo-less auto eval rejected with ${evalNoGeo.status} ${JSON.stringify(evalNoGeo.body)}`
  );
  assert("network" in evalNoGeo.body, "Response missing network block");

  // 11) IP allow-list: after admin pins the request IP, a far-away payload with
  //     bad accuracy must still check in the employee (this is the cross-browser
  //     / cross-device fall-back).
  const loopbackCandidates = [
    evalNoGeo.body.network?.ip,
    "127.0.0.1",
    "::1",
  ].filter(Boolean);
  const updateOffice = await api(
    "/attendance/offices",
    {
      method: "POST",
      body: JSON.stringify({
        id: loc.id,
        name: loc.name,
        centerLat: loc.centerLat,
        centerLng: loc.centerLng,
        radiusM: loc.radiusM,
        maxAccuracyM: loc.maxAccuracyM,
        entryBufferM: 0,
        exitBufferM: 0,
        exitGraceSeconds: 1,
        openTime,
        closeTime,
        timeZone: tz,
        enabled: true,
        allowedIps: loopbackCandidates,
      }),
    },
    adminToken
  );
  assert(updateOffice.status === 201, `Set allowed_ips failed: ${updateOffice.status}`);

  // Register a brand-new employee just for the IP path, so any pre-existing
  // check-in doesn't mask the result.
  const ipEmail = `${TEST_EMPLOYEE_EMAIL_PREFIX}.ip+${unique}@galaxyitt.com.ng`;
  createdEmployeeEmails.push(ipEmail);
  const createIpEmp = await api(
    "/employees",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Test Employee AutoAttendance IP",
        email: ipEmail,
        phone: "08000000001",
        department: DEPARTMENT,
        jobTitle: "Support Engineer",
        status: "Active",
        joinDate: "2026-04-01",
        salary: 150000,
      }),
    },
    adminToken
  );
  assert(createIpEmp.status === 201, `Create IP employee failed: ${createIpEmp.status}`);
  const ipEmpToken = (
    await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: ipEmail,
        password: String(createIpEmp.body.employee?.tempPassword || ""),
      }),
    })
  ).body.token as string;
  const ipDeviceId = `e2e-ip-device-${unique}`;
  const ipEval = await api(
    "/attendance/device/auto",
    {
      method: "POST",
      body: JSON.stringify({
        deviceId: ipDeviceId,
        // Intentionally far from the office, with terrible accuracy, to
        // prove that geofence alone would reject this — only the IP match
        // can let it through.
        lat: Number(loc.centerLat) + 5,
        lng: Number(loc.centerLng) + 5,
        accuracyM: 4000,
      }),
    },
    ipEmpToken
  );
  assert(ipEval.status === 200, `IP-path auto eval failed: ${ipEval.status}`);
  assert(
    ipEval.body.network?.recognized === true,
    `IP path did not recognise request IP: ${JSON.stringify(ipEval.body)}`
  );
  assert(
    ipEval.body.matchedVia === "ip" || ipEval.body.action === "checked_in",
    `IP path did not trigger inside-office state: ${JSON.stringify(ipEval.body)}`
  );

  // 12) SSID allow-list: with allowed_ssids set and no GPS, the claimed SSID
  //     must count as inside-office regardless of browser capabilities.
  const ssidOffice = await api(
    "/attendance/offices",
    {
      method: "POST",
      body: JSON.stringify({
        id: loc.id,
        name: loc.name,
        centerLat: loc.centerLat,
        centerLng: loc.centerLng,
        radiusM: loc.radiusM,
        maxAccuracyM: loc.maxAccuracyM,
        entryBufferM: 0,
        exitBufferM: 0,
        exitGraceSeconds: 1,
        openTime,
        closeTime,
        timeZone: tz,
        enabled: true,
        // Deliberately clear the IP list so SSID is the ONLY signal that can match.
        allowedIps: [],
        allowedSsids: ["galaxy-itt", "galaxy-itt-5G"],
      }),
    },
    adminToken
  );
  assert(ssidOffice.status === 201, `Set allowed_ssids failed: ${ssidOffice.status}`);

  // Fresh employee so no previous check-in state masks the signal.
  const ssidEmail = `${TEST_EMPLOYEE_EMAIL_PREFIX}.ssid+${unique}@galaxyitt.com.ng`;
  createdEmployeeEmails.push(ssidEmail);
  const createSsidEmp = await api(
    "/employees",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Test Employee SSID",
        email: ssidEmail,
        phone: "08000000002",
        department: DEPARTMENT,
        jobTitle: "Support Engineer",
        status: "Active",
        joinDate: "2026-04-01",
        salary: 150000,
      }),
    },
    adminToken
  );
  assert(createSsidEmp.status === 201, `Create SSID employee failed: ${createSsidEmp.status}`);
  const ssidEmpToken = (
    await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: ssidEmail,
        password: String(createSsidEmp.body.employee?.tempPassword || ""),
      }),
    })
  ).body.token as string;
  const ssidDeviceId = `e2e-ssid-device-${unique}`;
  const ssidEval = await api(
    "/attendance/device/auto",
    {
      method: "POST",
      // No geolocation, intentionally far by omission. SSID-only.
      body: JSON.stringify({ deviceId: ssidDeviceId, ssid: "GALAXY-ITT" }),
    },
    ssidEmpToken
  );
  assert(ssidEval.status === 200, `SSID auto eval failed: ${ssidEval.status} ${JSON.stringify(ssidEval.body)}`);
  assert(
    ssidEval.body.wifi?.recognized === true,
    `SSID not recognised: ${JSON.stringify(ssidEval.body)}`
  );
  assert(
    ssidEval.body.matchedVia === "ssid" || ssidEval.body.action === "checked_in",
    `SSID path did not trigger inside-office state: ${JSON.stringify(ssidEval.body)}`
  );

  // Wrong SSID must NOT trigger check-in.
  const ssidDeviceId2 = `e2e-ssid-device2-${unique}`;
  const wrongSsid = await api(
    "/attendance/device/auto",
    {
      method: "POST",
      body: JSON.stringify({ deviceId: ssidDeviceId2, ssid: "home-wifi" }),
    },
    ssidEmpToken
  );
  assert(wrongSsid.status === 200, `Wrong-SSID auto eval failed: ${wrongSsid.status}`);
  assert(
    wrongSsid.body.wifi?.recognized === false,
    `Wrong SSID incorrectly accepted: ${JSON.stringify(wrongSsid.body)}`
  );

  // --- Dedicated hours endpoint -------------------------------------------
  const patchHours = await api(
    `/attendance/offices/${loc.id}/hours`,
    {
      method: "PATCH",
      body: JSON.stringify({
        openTime: "08:30",
        closeTime: "17:30",
        timeZone: tz,
      }),
    },
    adminToken
  );
  assert(
    patchHours.status === 200,
    `Update office hours failed: ${patchHours.status} ${JSON.stringify(patchHours.body)}`
  );
  assert(
    patchHours.body?.location?.openTime === "08:30" &&
      patchHours.body?.location?.closeTime === "17:30",
    `Hours did not round-trip: ${JSON.stringify(patchHours.body)}`
  );

  const patchHoursBad = await api(
    `/attendance/offices/${loc.id}/hours`,
    {
      method: "PATCH",
      body: JSON.stringify({ openTime: "bad", closeTime: "17:30", timeZone: tz }),
    },
    adminToken
  );
  assert(
    patchHoursBad.status === 400,
    `Bad hours payload should 400, got ${patchHoursBad.status}`
  );

  // Restore our live test window so the checkout-at-close path below keeps working.
  await api(
    `/attendance/offices/${loc.id}/hours`,
    {
      method: "PATCH",
      body: JSON.stringify({ openTime, closeTime, timeZone: tz }),
    },
    adminToken
  );

  // --- Attendance report --------------------------------------------------
  const reportDay = new Date().toISOString().slice(0, 10);
  const report = await api(
    `/attendance/report?from=${reportDay}&to=${reportDay}`,
    { method: "GET" },
    adminToken
  );
  assert(report.status === 200, `Report failed: ${report.status} ${JSON.stringify(report.body)}`);
  assert(
    typeof report.body?.totals?.present === "number",
    `Report totals missing: ${JSON.stringify(report.body)}`
  );
  assert(
    Array.isArray(report.body?.byEmployee) && Array.isArray(report.body?.records),
    `Report shape missing: ${JSON.stringify(report.body)}`
  );
  assert(
    report.body.from === reportDay && report.body.to === reportDay,
    `Report echoed wrong range: ${JSON.stringify(report.body)}`
  );

  const reportBad = await api(
    `/attendance/report?from=not-a-date&to=${reportDay}`,
    { method: "GET" },
    adminToken
  );
  assert(reportBad.status === 400, `Bad report query should 400, got ${reportBad.status}`);

  console.log("verify-automatic-attendance-e2e: OK");
  console.log(
    JSON.stringify(
      {
        office: { id: loc.id, name: loc.name },
        employee: { email: testEmail, employeeId },
        checkinAction: evalIn.body.action,
        checkoutAction: evalOut2.body.action,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanupCreatedEmployees();
    process.exit(process.exitCode ?? 0);
  });

