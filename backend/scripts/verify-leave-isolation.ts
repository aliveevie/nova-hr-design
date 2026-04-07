import "dotenv/config";
import { randomUUID } from "crypto";
import { getSql, isSupabaseEnabled } from "../src/config/supabase.js";
import {
  createLeaveRequest,
  getLeaveRequests,
  updateLeaveRequest,
  getLeaveBalance,
} from "../src/services/leave.service.js";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  if (!isSupabaseEnabled) {
    throw new Error("verify-leave-isolation requires USE_SUPABASE/production DB mode");
  }
  const sql = getSql();
  if (!sql) throw new Error("SQL client not available");

  const marker = `leave-scope-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const hrAId = randomUUID();
  const hrBId = randomUUID();
  const empAId = randomUUID();
  const empBId = randomUUID();

  const hrAEmail = `${marker}-hra@example.com`;
  const hrBEmail = `${marker}-hrb@example.com`;
  const empAEmail = `${marker}-empa@example.com`;
  const empBEmail = `${marker}-empb@example.com`;

  let reqAId = "";
  let reqBId = "";

  try {
    await sql`
      insert into users (id, name, email, password, role, initials)
      values
      (${hrAId}, ${"Scope Admin A"}, ${hrAEmail}, ${"x"}, ${"HR Admin"}, ${"AA"}),
      (${hrBId}, ${"Scope Admin B"}, ${hrBEmail}, ${"x"}, ${"HR Admin"}, ${"BB"})
    `;

    await sql`
      insert into employees (
        id, name, email, phone, department, job_title, status, join_date, salary, initials, admin_owner_id
      ) values
      (${empAId}, ${"Scoped Emp A"}, ${empAEmail}, ${"08000000001"}, ${"Engineering"}, ${"Developer"}, ${"Active"}, ${"2026-01-01"}, ${100000}, ${"EA"}, ${hrAId}),
      (${empBId}, ${"Scoped Emp B"}, ${empBEmail}, ${"08000000002"}, ${"Engineering"}, ${"Developer"}, ${"Active"}, ${"2026-01-01"}, ${120000}, ${"EB"}, ${hrBId})
    `;

    await sql`
      insert into leave_balances (id, employee_id, annual_leave, sick_leave, maternity_leave, casual_leave)
      values
      (${randomUUID()}, ${empAId}, 20, 10, 0, 5),
      (${randomUUID()}, ${empBId}, 20, 10, 0, 5)
    `;

    const reqA = await createLeaveRequest({
      employeeId: empAId,
      type: "Annual Leave",
      from: "2026-04-10",
      to: "2026-04-12",
      days: 3,
      reason: marker,
    });
    const reqB = await createLeaveRequest({
      employeeId: empBId,
      type: "Sick Leave",
      from: "2026-04-11",
      to: "2026-04-11",
      days: 1,
      reason: marker,
    });

    reqAId = String((reqA as { id: string }).id);
    reqBId = String((reqB as { id: string }).id);

    const aScope = await getLeaveRequests({ scopeAdminOwnerId: hrAId });
    const bScope = await getLeaveRequests({ scopeAdminOwnerId: hrBId });

    assert(aScope.length === 1, "HR Admin A should see exactly 1 request");
    assert(bScope.length === 1, "HR Admin B should see exactly 1 request");
    assert(String((aScope[0] as any).employee_id) === empAId, "HR Admin A saw wrong employee request");
    assert(String((bScope[0] as any).employee_id) === empBId, "HR Admin B saw wrong employee request");

    const unscoped = await getLeaveRequests();
    assert(Array.isArray(unscoped) && unscoped.length === 0, "Unscoped leave list must be empty");

    await updateLeaveRequest(reqAId, { status: "Approved" });
    const balA = await getLeaveBalance(empAId);
    assert(balA.annualLeave === 17, "Annual leave should decrement from 20 to 17 on approval");

    console.log("verify-leave-isolation: OK");
  } finally {
    // Cleanup only our marker data
    await sql`delete from leave_requests where reason = ${marker}`;
    await sql`delete from leave_balances where employee_id in (${empAId}, ${empBId})`;
    await sql`delete from users where employee_id in (${empAId}, ${empBId})`;
    await sql`delete from employees where id in (${empAId}, ${empBId})`;
    await sql`delete from users where id in (${hrAId}, ${hrBId})`;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
