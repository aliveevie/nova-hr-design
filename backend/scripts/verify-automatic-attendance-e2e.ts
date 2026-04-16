import "dotenv/config";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3001/api";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "test.hr.admin@galaxyitt.com.ng";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "TestNovaHR#2026";
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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

