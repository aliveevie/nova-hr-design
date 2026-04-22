import "dotenv/config";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3001/api";
const ADMIN_EMAIL = "test.hr.admin@galaxyitt.com.ng";
const ADMIN_PASSWORD = "TestNovaHR#2026";
const USER_EMAIL = "test@galaxyitt.com.ng";
const USER_PASSWORD = ".ik8dc30o3m8.BVG26MOMK89!@#";

type ApiResp = { status: number; body: any };

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

async function api(path: string, opts: RequestInit = {}, token?: string): Promise<ApiResp> {
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string> | undefined) };
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
const pad2 = (n: number) => String(n).padStart(2, "0");
const minutesToHHMM = (totalMinutes: number) => {
  const m = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
};
const nowMinutesInTz = (timeZone: string, d = new Date()): number => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  return Number(parts.find((p) => p.type === "hour")?.value) * 60 +
    Number(parts.find((p) => p.type === "minute")?.value);
};

async function main() {
  console.log("Step 1: Admin login");
  const adminLogin = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  assert(adminLogin.status === 200, `Admin login failed: ${adminLogin.status} ${JSON.stringify(adminLogin.body)}`);
  const adminToken = String(adminLogin.body.token || "");

  console.log("Step 2: Ensure test employee is in admin's scope");
  const empList = await api("/employees", {}, adminToken);
  assert(empList.status === 200, `List employees failed: ${empList.status}`);
  const testEmp = (empList.body.employees || []).find((e: any) => String(e.email).toLowerCase() === USER_EMAIL);
  assert(testEmp, `Test employee not visible to test admin (check admin_owner_id for ${USER_EMAIL})`);
  console.log("  employee visible:", testEmp.id, testEmp.name, testEmp.department);

  console.log("Step 3: Admin sets up office location (hours = current minute ±1)");
  const tz = "Africa/Lagos";
  const nowMin = nowMinutesInTz(tz);
  const officePayload = {
    name: "Nova HQ (live test)",
    centerLat: 9.076512,
    centerLng: 7.398634,
    radiusM: 80,
    maxAccuracyM: 200,
    entryBufferM: 0,
    exitBufferM: 0,
    exitGraceSeconds: 1,
    openTime: minutesToHHMM(nowMin - 1),
    closeTime: minutesToHHMM(nowMin + 2),
    timeZone: tz,
    enabled: true,
  };
  const existing = await api("/attendance/offices", {}, adminToken);
  assert(existing.status === 200, `List offices failed: ${existing.status}`);
  const existingFirst = (existing.body.locations || [])[0];
  const upsertBody = existingFirst ? { id: existingFirst.id, ...officePayload } : officePayload;
  const office = await api(
    "/attendance/offices",
    { method: "POST", body: JSON.stringify(upsertBody) },
    adminToken
  );
  assert(office.status === 201, `Save office failed: ${office.status} ${JSON.stringify(office.body)}`);
  const loc = office.body.location;
  console.log("  office:", loc.name, `${loc.centerLat},${loc.centerLng}`, `${loc.openTime}-${loc.closeTime}`, loc.timeZone);

  console.log("Step 4: Employee login");
  const userLogin = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: USER_EMAIL, password: USER_PASSWORD }),
  });
  assert(userLogin.status === 200, `Employee login failed: ${userLogin.status} ${JSON.stringify(userLogin.body)}`);
  const userToken = String(userLogin.body.token || "");

  console.log("Step 5: Employee GET /attendance/office");
  const empOffice = await api("/attendance/office", {}, userToken);
  assert(empOffice.status === 200, `Get employee office failed: ${empOffice.status}`);
  assert(empOffice.body?.location?.id, "Employee cannot see admin-configured office");
  console.log("  employee sees:", empOffice.body.location.name);

  console.log("Step 6: Employee registers device (default to login device)");
  const deviceId = `live-${Date.now()}`;
  const reg = await api(
    "/attendance/device/register",
    {
      method: "POST",
      body: JSON.stringify({
        deviceId,
        deviceLabel: "Android phone (live test)",
        lat: loc.centerLat,
        lng: loc.centerLng,
        accuracyM: 25,
      }),
    },
    userToken
  );
  assert(reg.status === 201, `Device register failed: ${reg.status} ${JSON.stringify(reg.body)}`);

  console.log("Step 7: Employee lists devices");
  const devs = await api("/attendance/device", {}, userToken);
  assert(devs.status === 200 && devs.body.devices?.some((d: any) => d.deviceId === deviceId), `List devices failed`);

  console.log("Step 8: Auto evaluate INSIDE -> expect checked_in");
  const evalIn = await api(
    "/attendance/device/auto",
    {
      method: "POST",
      body: JSON.stringify({ deviceId, lat: loc.centerLat, lng: loc.centerLng, accuracyM: 25 }),
    },
    userToken
  );
  assert(evalIn.status === 200, `Auto eval inside failed: ${evalIn.status} ${JSON.stringify(evalIn.body)}`);
  console.log("  action:", evalIn.body.action);

  console.log("Step 9: Move OUTSIDE, wait grace, evaluate -> expect checked_out");
  const outLat = loc.centerLat + 0.01;
  const outLng = loc.centerLng + 0.01;
  await api(
    "/attendance/device/auto",
    { method: "POST", body: JSON.stringify({ deviceId, lat: outLat, lng: outLng, accuracyM: 25 }) },
    userToken
  );
  await sleep(1500);
  const evalOut = await api(
    "/attendance/device/auto",
    { method: "POST", body: JSON.stringify({ deviceId, lat: outLat, lng: outLng, accuracyM: 25 }) },
    userToken
  );
  assert(evalOut.status === 200, `Auto eval outside failed: ${evalOut.status}`);
  console.log("  action:", evalOut.body.action);

  console.log("Step 10: Admin sees employee's attendance for today");
  const today = new Date().toISOString().split("T")[0];
  const list = await api(`/attendance?date=${encodeURIComponent(today)}`, {}, adminToken);
  assert(list.status === 200, `Admin GET attendance failed: ${list.status}`);
  const rec = (list.body.attendance || []).find((r: any) => r.employeeId === testEmp.id);
  assert(rec, "Admin cannot see attendance record for test employee today");
  console.log("  admin row:", rec.employee, rec.checkIn, "->", rec.checkOut, rec.status);

  console.log("\nLIVE END-TO-END: OK");
  console.log(
    JSON.stringify(
      {
        admin: ADMIN_EMAIL,
        employee: USER_EMAIL,
        office: { id: loc.id, name: loc.name, hours: `${loc.openTime}-${loc.closeTime}`, tz: loc.timeZone },
        checkin: evalIn.body.action,
        checkout: evalOut.body.action,
        adminSees: { checkIn: rec.checkIn, checkOut: rec.checkOut, status: rec.status },
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
