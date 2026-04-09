/**
 * Sanity-check: invite onboarding payload shape matches employeeSchema after normalization.
 * Run: npx tsx scripts/verify-invite-submit-validation.ts
 */
import { employeeSchema } from "../src/utils/validators.js";
import { normalizeInviteEmployeeBody } from "../src/utils/invite-employee-payload.util.js";

const validInvitePayload = {
  name: "Test User",
  email: "invite-test@example.com",
  phone: "+2348000000000",
  department: "Technical Operations",
  jobTitle: "Developer",
  status: "Active",
  joinDate: "2025-01-15",
  salary: 150000,
};

const missingDept = { ...validInvitePayload };
delete (missingDept as { department?: string }).department;

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const ok = employeeSchema.safeParse(normalizeInviteEmployeeBody(validInvitePayload));
assert(ok.success, "validInvitePayload should pass");

const bad = employeeSchema.safeParse(normalizeInviteEmployeeBody(missingDept));
assert(!bad.success, "payload without department should fail");

console.log("verify-invite-submit-validation: OK");
