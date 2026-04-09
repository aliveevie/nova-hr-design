import { createHash, randomBytes, randomUUID } from "crypto";
import { getDatabase, dbHelpers } from "../config/database.js";
import { getSql, isSupabaseEnabled } from "../config/supabase.js";
import { createEmployee } from "./employee.service.js";
import { employeeSchema } from "../utils/validators.js";
import { normalizeInviteEmployeeBody } from "../utils/invite-employee-payload.util.js";
import { hashPassword } from "../utils/password.util.js";
import { sendWelcomeEmailForNewEmployeeRow } from "./email.service.js";

const ONBOARDING_EMAIL_DOMAIN = "galaxyitt.com.ng";
const RESEND_WINDOW_MS = 2 * 60 * 1000;
const resendGuard = new Map<string, number>();

const hashToken = (raw: string) =>
  createHash("sha256").update(raw, "utf8").digest("hex");

export type StaffInviteRow = {
  id: string;
  raw_token?: string | null;
  token_hash: string;
  admin_user_id: string;
  label: string | null;
  expires_at: string | Date;
  revoked_at: string | Date | null;
  created_at: string | Date;
};

export const createStaffInvite = async (
  adminUserId: string,
  opts?: { label?: string; expiresInDays?: number }
) => {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const days = opts?.expiresInDays ?? 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const [row] = await sql`
      insert into staff_invites (raw_token, token_hash, admin_user_id, label, expires_at)
      values (${rawToken}, ${tokenHash}, ${adminUserId}, ${opts?.label ?? null}, ${expiresAt.toISOString()})
      returning id, raw_token, token_hash, admin_user_id, label, expires_at, revoked_at, created_at
    `;
    return { rawToken, invite: row as StaffInviteRow };
  }

  await dbHelpers.read();
  const db = getDatabase();
  if (!db.data.staffInvites) db.data.staffInvites = [];
  const id = randomUUID();
  const invite = {
    id,
    raw_token: rawToken,
    token_hash: tokenHash,
    admin_user_id: adminUserId,
    label: opts?.label ?? null,
    expires_at: expiresAt.toISOString(),
    revoked_at: null,
    created_at: new Date().toISOString(),
  };
  (db.data as any).staffInvites.push(invite);
  await dbHelpers.write();
  return { rawToken, invite: invite as StaffInviteRow };
};

export const listInvitesForAdmin = async (adminUserId: string) => {
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    return sql`
      select i.id, i.raw_token, i.label, i.expires_at, i.revoked_at, i.created_at,
        (select count(*)::int from employees e where e.created_via_invite_id = i.id) as completion_count
      from staff_invites i
      where i.admin_user_id = ${adminUserId}
      order by i.created_at desc
    `;
  }
  await dbHelpers.read();
  const db = getDatabase();
  const invites = ((db.data as any).staffInvites || []) as any[];
  const emps = db.data.employees || [];
  return invites
    .filter((i) => i.admin_user_id === adminUserId)
    .map((i) => ({
      id: i.id,
      raw_token: i.raw_token ?? null,
      label: i.label,
      expires_at: i.expires_at,
      revoked_at: i.revoked_at,
      created_at: i.created_at,
      completion_count: emps.filter((e: any) => e.created_via_invite_id === i.id).length,
    }))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
};

export const getInviteStatsForAdmin = async (adminUserId: string) => {
  const invites = await listInvitesForAdmin(adminUserId);
  const totalCompletions = invites.reduce(
    (s, i: any) => s + (Number(i.completion_count) || 0),
    0
  );
  return {
    inviteCount: invites.length,
    totalCompletions,
    activeInvites: invites.filter((i: any) => {
      if (i.revoked_at) return false;
      return new Date(i.expires_at) > new Date();
    }).length,
  };
};

export const revokeInviteForAdmin = async (adminUserId: string, inviteId: string) => {
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const rows = await sql`
      update staff_invites
      set revoked_at = now()
      where id = ${inviteId} and admin_user_id = ${adminUserId}
      returning id
    `;
    return rows[0] || null;
  }
  await dbHelpers.read();
  const db = getDatabase();
  const invites = ((db.data as any).staffInvites || []) as any[];
  const idx = invites.findIndex((i) => i.id === inviteId && i.admin_user_id === adminUserId);
  if (idx === -1) return null;
  invites[idx].revoked_at = new Date().toISOString();
  await dbHelpers.write();
  return { id: inviteId };
};

export const deleteInviteForAdmin = async (adminUserId: string, inviteId: string) => {
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const rows = await sql`
      delete from staff_invites
      where id = ${inviteId} and admin_user_id = ${adminUserId}
      returning id
    `;
    return rows[0] || null;
  }
  await dbHelpers.read();
  const db = getDatabase();
  const invites = ((db.data as any).staffInvites || []) as any[];
  const idx = invites.findIndex((i) => i.id === inviteId && i.admin_user_id === adminUserId);
  if (idx === -1) return null;
  invites.splice(idx, 1);
  await dbHelpers.write();
  return { id: inviteId };
};

const findInviteByRawToken = async (rawToken: string) => {
  const tokenHash = hashToken(rawToken);
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const rows = await sql`
      select * from staff_invites where token_hash = ${tokenHash} limit 1
    `;
    return rows[0] || null;
  }
  await dbHelpers.read();
  const db = getDatabase();
  const invites = ((db.data as any).staffInvites || []) as any[];
  return invites.find((i) => i.token_hash === tokenHash) || null;
};

export const validateStaffInviteToken = async (rawToken: string) => {
  const invite = await findInviteByRawToken(rawToken);
  if (!invite) return { valid: false as const, reason: "invalid" as const };
  if (invite.revoked_at) return { valid: false as const, reason: "revoked" as const };
  if (new Date(invite.expires_at) <= new Date())
    return { valid: false as const, reason: "expired" as const };
  return { valid: true as const, invite };
};

export const submitStaffInvite = async (rawToken: string, body: unknown) => {
  const normalized = normalizeInviteEmployeeBody(body);
  const validation = employeeSchema.safeParse(normalized);
  if (!validation.success) {
    return { success: false as const, errors: validation.error.errors };
  }
  const email = String(validation.data.email || "").trim().toLowerCase();
  if (!email.endsWith(`@${ONBOARDING_EMAIL_DOMAIN}`)) {
    return {
      success: false as const,
      errors: [
        {
          code: "custom",
          path: ["email"],
          message: `Use your @${ONBOARDING_EMAIL_DOMAIN} work email`,
        },
      ],
    };
  }

  const checked = await validateStaffInviteToken(rawToken);
  if (!checked.valid || !("invite" in checked)) {
    return { success: false as const, error: "Invalid or expired invite link" };
  }
  const invite = checked.invite as StaffInviteRow;

  const employee = await createEmployee(validation.data, {
    adminOwnerId: invite.admin_user_id,
    createdViaInviteId: invite.id,
  });

  return { success: true as const, employee };
};

const makeTempPassword = () =>
  Math.random().toString(36).slice(-12) +
  Math.random().toString(36).slice(-12).toUpperCase() +
  "!@#";

export const resendWelcomeEmailForInvite = async (params: {
  rawToken: string;
  email: string;
  ipAddress?: string;
  deviceId?: string;
}) => {
  const email = String(params.email || "").trim().toLowerCase();
  if (!email.endsWith(`@${ONBOARDING_EMAIL_DOMAIN}`)) {
    return { success: false as const, error: `Use your @${ONBOARDING_EMAIL_DOMAIN} work email` };
  }

  const checked = await validateStaffInviteToken(params.rawToken);
  if (!checked.valid || !("invite" in checked)) {
    return { success: false as const, error: "Invalid or expired invite link" };
  }
  const invite = checked.invite as StaffInviteRow;

  const gateKey = `${invite.id}:${email}:${params.deviceId || "-"}:${params.ipAddress || "-"}`;
  const last = resendGuard.get(gateKey) || 0;
  if (Date.now() - last < RESEND_WINDOW_MS) {
    return {
      success: false as const,
      error: "Resend already requested recently. Please wait 2 minutes and try again.",
    };
  }

  let employee: any = null;
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const rows = await sql`
      select * from employees
      where created_via_invite_id = ${invite.id}
        and lower(email) = ${email}
      limit 1
    `;
    employee = rows[0] || null;
    if (!employee) {
      const fallbackRows = await sql`
        select * from employees
        where admin_owner_id = ${invite.admin_user_id}
          and lower(email) = ${email}
        limit 1
      `;
      employee = fallbackRows[0] || null;
    }
    if (!employee) {
      const globalRows = await sql`
        select * from employees
        where lower(email) = ${email}
        limit 1
      `;
      employee = globalRows[0] || null;
    }
    if (!employee) {
      // Prevent account enumeration: return success message even when no match exists.
      resendGuard.set(gateKey, Date.now());
      return { success: true as const };
    }
    const tempPassword = makeTempPassword();
    const hashed = await hashPassword(tempPassword);
    await sql`
      update users
      set password = ${hashed}, password_must_change = false
      where employee_id = ${employee.id}
    `;
    const sent = await sendWelcomeEmailForNewEmployeeRow(employee, tempPassword);
    if (!sent.success) {
      return { success: false as const, error: "Email could not be sent right now. Please try again." };
    }
  } else {
    await dbHelpers.read();
    const db = getDatabase();
    employee = (db.data.employees || []).find(
      (e: any) =>
        String(e.created_via_invite_id || "") === String(invite.id) &&
        String(e.email || "").toLowerCase() === email
    );
    if (!employee) {
      employee = (db.data.employees || []).find(
        (e: any) =>
          String(e.admin_owner_id || "") === String(invite.admin_user_id) &&
          String(e.email || "").toLowerCase() === email
      );
    }
    if (!employee) {
      employee = (db.data.employees || []).find(
        (e: any) => String(e.email || "").toLowerCase() === email
      );
    }
    if (!employee) {
      // Prevent account enumeration: return success message even when no match exists.
      resendGuard.set(gateKey, Date.now());
      return { success: true as const };
    }
    const tempPassword = makeTempPassword();
    const hashed = await hashPassword(tempPassword);
    const u = (db.data.users || []).find((x: any) => String(x.employeeId || x.employee_id) === String(employee.id));
    if (!u) {
      return { success: false as const, error: "Employee account not found for resend." };
    }
    u.password = hashed;
    u.password_must_change = false;
    u.updated_at = new Date().toISOString();
    await dbHelpers.write();
    const sent = await sendWelcomeEmailForNewEmployeeRow(employee, tempPassword);
    if (!sent.success) {
      return { success: false as const, error: "Email could not be sent right now. Please try again." };
    }
  }

  resendGuard.set(gateKey, Date.now());
  return { success: true as const };
};
