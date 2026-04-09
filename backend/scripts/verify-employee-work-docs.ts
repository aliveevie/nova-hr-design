import "dotenv/config";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3001/api";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "test.hr.admin@galaxyitt.com.ng";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "TestNovaHR#2026";
const TEST_EMPLOYEE_EMAIL_PREFIX = process.env.E2E_WORKDOC_EMPLOYEE_EMAIL_PREFIX || "test.employee.docs";
const DEPARTMENT = "Technical Operations";

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

async function main() {
  const loginAdmin = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  assert(loginAdmin.status === 200, `Admin login failed: ${loginAdmin.status}`);
  const adminToken = String(loginAdmin.body.token || "");
  assert(adminToken, "Missing admin token");

  const list = await api("/employees", {}, adminToken);
  assert(list.status === 200, `GET /employees failed: ${list.status}`);
  const unique = Date.now();
  const testEmail = `${TEST_EMPLOYEE_EMAIL_PREFIX}+${unique}@galaxyitt.com.ng`;
  const create = await api(
    "/employees",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Test Employee Docs",
        email: testEmail,
        phone: "08000000000",
        department: DEPARTMENT,
        jobTitle: "Cloud Operations Officer",
        status: "Active",
        joinDate: "2026-04-01",
        salary: 150000,
      }),
    },
    adminToken
  );
  assert(create.status === 201, `Create employee failed: ${create.status}`);
  const target = create.body.employee;
  const tempPassword = String(create.body.employee?.tempPassword || "");
  assert(tempPassword.length > 0, "Missing temp password for created test employee");

  const employeeId = String(target.id);
  assert(employeeId, "Missing employee id");

  const jobProfileText = "JOB PROFILE\nEmployee Information\nJob Title: Cloud Operations Officer";
  const jobProfileForm = new FormData();
  jobProfileForm.append("textContent", jobProfileText);
  const uploadJobProfile = await api(
    `/employees/${employeeId}/job-profile`,
    { method: "POST", body: jobProfileForm },
    adminToken
  );
  assert(uploadJobProfile.status === 201, `Upload job profile failed: ${uploadJobProfile.status}`);

  const okrCsv = "Objective,KR,Weight\nImprove Platform Stability,Maintain 99.9% uptime,50";
  const okrTemplateForm = new FormData();
  okrTemplateForm.append("file", new Blob([okrCsv], { type: "text/csv" }), "okr-template.csv");
  const uploadOkrTemplate = await api(
    `/employees/${employeeId}/okr-template`,
    { method: "POST", body: okrTemplateForm },
    adminToken
  );
  assert(uploadOkrTemplate.status === 201, `Upload OKR template failed: ${uploadOkrTemplate.status}`);

  // Ensure employee user exists by attempting login; if not, create user manually is outside script scope.
  const loginEmployee = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: testEmail, password: tempPassword }),
  });
  assert(
    loginEmployee.status === 200,
    `Employee login failed (${loginEmployee.status}).`
  );
  const employeeToken = String(loginEmployee.body.token || "");
  assert(employeeToken, "Missing employee token");

  const submitOkrForm = new FormData();
  submitOkrForm.append("file", new Blob([okrCsv], { type: "text/csv" }), "okr-submission.csv");
  const submitOkr = await api(
    `/employees/${employeeId}/okr-submission`,
    { method: "POST", body: submitOkrForm },
    employeeToken
  );
  assert(submitOkr.status === 201, `Employee OKR submission failed: ${submitOkr.status}`);

  const docs = await api(`/employees/${employeeId}/work-docs`, {}, employeeToken);
  assert(docs.status === 200, `Fetch work docs failed: ${docs.status}`);
  assert(!!docs.body.jobProfile, "Missing job profile");
  assert(!!docs.body.okrTemplate, "Missing OKR template");
  assert(!!docs.body.okrSubmission, "Missing OKR submission");

  const download = await fetch(`${BASE}/employees/${employeeId}/work-docs/okr_admin/download`, {
    headers: { authorization: `Bearer ${employeeToken}` },
  });
  assert(download.status === 200, `Download OKR template failed: ${download.status}`);

  console.log("verify-employee-work-docs: OK");
  console.log(`employee=${testEmail} employeeId=${employeeId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
