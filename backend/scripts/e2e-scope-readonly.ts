import "dotenv/config";
import jwt from "jsonwebtoken";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3001/api";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "test.hr.admin@galaxyitt.com.ng";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "TestNovaHR#2026";
const TARGET_EMPLOYEE_EMAIL = process.env.E2E_EMPLOYEE_EMAIL || "test@galaxyitt.com.ng";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

type Json = Record<string, any>;

async function api(path: string, opts: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  return { status: res.status, body };
}

async function main() {
  const login = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  assert(login.status === 200, `Admin login failed: ${login.status}`);
  const adminToken = login.body.token as string;
  assert(!!adminToken, "Admin token missing");

  const employeesRes = await api("/employees", {}, adminToken);
  assert(employeesRes.status === 200, `GET /employees failed: ${employeesRes.status}`);
  const employees = (employeesRes.body.employees || []) as any[];
  assert(employees.length > 0, "No scoped employees returned for admin");

  const employeeMap = new Map<string, any>(employees.map((e) => [String(e.id), e]));
  const targetEmployee = employees.find((e) => String(e.email || "").toLowerCase() === TARGET_EMPLOYEE_EMAIL.toLowerCase()) || employees[0];
  assert(targetEmployee?.id, "No employee available for employee-side checks");

  // Employee token for read-only scope checks (no password reset / no data mutation)
  const employeeToken = jwt.sign(
    {
      userId: `e2e-user-${targetEmployee.id}`,
      email: targetEmployee.email,
      role: "Employee",
      employeeId: targetEmployee.id,
    },
    JWT_SECRET,
    { expiresIn: "10m" }
  );

  // Admin list endpoints should only reference in-scope employees
  const scopedEndpoints = [
    ["/leave/requests", "leaveRequests", "employeeId"],
    ["/attendance", "attendance", "employeeId"],
    ["/payroll", "payrolls", "employeeId"],
    ["/performance", "performances", "employeeId"],
    ["/training", "trainings", "employeeId"],
    ["/discipline", "disciplines", "employeeId"],
  ] as const;

  for (const [path, key, empKey] of scopedEndpoints) {
    const r = await api(path, {}, adminToken);
    assert(r.status === 200, `Admin ${path} failed: ${r.status}`);
    const rows = (r.body[key] || []) as any[];
    for (const row of rows) {
      const id = String(row[empKey] || "");
      assert(employeeMap.has(id), `Scope leak on ${path}: employee ${id} not in admin employee list`);
    }
  }

  // Employee read endpoints (own-only)
  const ownChecks = [
    `/leave/requests?employeeId=${encodeURIComponent(targetEmployee.id)}`,
    `/payroll?employeeId=${encodeURIComponent(targetEmployee.id)}`,
    `/performance?employeeId=${encodeURIComponent(targetEmployee.id)}`,
    `/training?employeeId=${encodeURIComponent(targetEmployee.id)}`,
    `/discipline?employeeId=${encodeURIComponent(targetEmployee.id)}`,
    `/attendance/${encodeURIComponent(targetEmployee.id)}`,
    `/leave/balance/${encodeURIComponent(targetEmployee.id)}`,
  ];
  for (const p of ownChecks) {
    const r = await api(p, {}, employeeToken);
    assert(r.status === 200, `Employee own endpoint failed ${p}: ${r.status}`);
  }

  // Employee forbidden actions
  const forbiddenCalls: Array<[string, RequestInit]> = [
    ["/leave/requests/some-id", { method: "PUT", body: JSON.stringify({ status: "Approved" }) }],
    ["/attendance/summary?month=04&year=2026", { method: "GET" }],
    ["/payroll", { method: "POST", body: JSON.stringify({}) }],
    ["/performance", { method: "POST", body: JSON.stringify({}) }],
    ["/training", { method: "POST", body: JSON.stringify({}) }],
    ["/discipline", { method: "POST", body: JSON.stringify({}) }],
  ];

  for (const [p, opts] of forbiddenCalls) {
    const r = await api(p, opts, employeeToken);
    assert(r.status === 403 || r.status === 404, `Expected forbidden on ${p}, got ${r.status}`);
  }

  console.log("e2e-scope-readonly: OK");
  console.log(`admin=${ADMIN_EMAIL} employee=${targetEmployee.email}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
