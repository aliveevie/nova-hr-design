import "dotenv/config";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3001/api";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "test.hr.admin@galaxyitt.com.ng";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "TestNovaHR#2026";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

async function jsonApi(path: string, opts: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (!(opts.body instanceof FormData)) headers["content-type"] = headers["content-type"] || "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body };
}

async function main() {
  const login = await jsonApi("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  assert(login.ok, `Admin login failed: ${login.status}`);
  const token = String(login.body.token || "");
  assert(token, "Missing admin token");

  const created = await jsonApi(
    "/invites",
    {
      method: "POST",
      body: JSON.stringify({ label: "E2E resend flow", expiresInDays: 30 }),
    },
    token
  );
  assert(created.status === 201, `Invite create failed: ${created.status}`);
  const rawToken = String(created.body.token || "");
  assert(rawToken, "Missing raw invite token");

  const email = `resend.e2e+${Date.now()}@galaxyitt.com.ng`;
  const submit = await jsonApi(`/public/staff-invite/${encodeURIComponent(rawToken)}/submit`, {
    method: "POST",
    body: JSON.stringify({
      name: "Resend E2E User",
      email,
      phone: "08000000000",
      department: "Technical Operations",
      jobTitle: "Cloud Operations Officer",
      status: "Active",
      joinDate: "2026-04-01",
      salary: 150000,
    }),
  });
  assert(submit.status === 201, `Invite submit failed: ${submit.status}`);

  const resendKnown = await jsonApi(`/public/staff-invite/${encodeURIComponent(rawToken)}/resend-welcome`, {
    method: "POST",
    body: JSON.stringify({ email, deviceId: "e2e-device-1" }),
  });
  assert(resendKnown.ok, `Resend for known user failed: ${resendKnown.status}`);

  const resendUnknown = await jsonApi(`/public/staff-invite/${encodeURIComponent(rawToken)}/resend-welcome`, {
    method: "POST",
    body: JSON.stringify({ email: "unknown.user@galaxyitt.com.ng", deviceId: "e2e-device-2" }),
  });
  assert(resendUnknown.ok, `Resend for unknown email should not fail: ${resendUnknown.status}`);

  console.log("verify-invite-resend-e2e: OK");
  console.log(JSON.stringify({ email, resendKnown: resendKnown.status, resendUnknown: resendUnknown.status }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
