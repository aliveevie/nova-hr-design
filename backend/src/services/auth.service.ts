import crypto from "crypto";
import { getDatabase, dbHelpers } from "../config/database.js";
import { comparePassword, hashPassword } from "../utils/password.util.js";
import { generateToken } from "../utils/jwt.util.js";
import { getSql, isSupabaseEnabled } from "../config/supabase.js";
import { env } from "../config/env.js";

export interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

const ADMIN_FIRST_LOGIN_EMAIL = "mabubakar@galaxyitt.com.ng";
const FIRST_LOGIN_VERIFY_TTL_MINUTES = 30;

const normalizeUser = (user: any) => ({
  ...user,
  employeeId: user.employeeId ?? user.employee_id ?? null,
});

const stripPassword = (user: any) => {
  const normalized = normalizeUser(user);
  const { password, employee_id, ...userWithoutPassword } = normalized;
  userWithoutPassword.mustChangePassword = Boolean(
    normalized.password_must_change ?? normalized.mustChangePassword ?? false
  );
  userWithoutPassword.firstLoginVerified = Boolean(
    normalized.first_login_verified ?? normalized.firstLoginVerified ?? false
  );
  return userWithoutPassword;
};

const hashLoginVerifyToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const shouldGateFirstLogin = (user: any) =>
  String(user.email || "").toLowerCase() === ADMIN_FIRST_LOGIN_EMAIL &&
  Boolean(user.password_must_change) &&
  !Boolean(user.first_login_verified ?? user.firstLoginVerified);

export const login = async (credentials: LoginCredentials, context?: LoginContext) => {
  const email = credentials.email.toLowerCase();

  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const rows = await sql`select * from users where lower(email) = ${email} limit 1`;
    const user = rows[0];

    if (!user) return null;

    const isValid = await comparePassword(credentials.password, user.password);
    if (!isValid) return null;

    if (shouldGateFirstLogin(user)) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashLoginVerifyToken(rawToken);
      const expiresAt = new Date(
        Date.now() + FIRST_LOGIN_VERIFY_TTL_MINUTES * 60 * 1000
      ).toISOString();

      await sql`
        update login_verification_tokens
        set used_at = now()
        where user_id = ${user.id}
          and used_at is null
      `;

      await sql`
        insert into login_verification_tokens (user_id, token_hash, ip_address, user_agent, expires_at)
        values (${user.id}, ${tokenHash}, ${context?.ipAddress || null}, ${context?.userAgent || null}, ${expiresAt})
      `;

      return {
        requiresFirstLoginVerification: true as const,
        verificationToken: rawToken,
        user: stripPassword(user),
      };
    }

    const cleanUser = stripPassword(user);
    const token = generateToken({
      userId: cleanUser.id,
      email: cleanUser.email,
      role: cleanUser.role,
      employeeId: cleanUser.employeeId,
    });

    return { user: cleanUser, token };
  }

  await dbHelpers.read();
  const db = getDatabase();
  const user = db.data.users.find((u) => u.email.toLowerCase() === email);

  if (!user) return null;

  const isValid = await comparePassword(credentials.password, user.password);
  if (!isValid) return null;

  if (shouldGateFirstLogin(user)) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashLoginVerifyToken(rawToken);
    const expiresAt = new Date(
      Date.now() + FIRST_LOGIN_VERIFY_TTL_MINUTES * 60 * 1000
    ).toISOString();

    if (!(db.data as any).loginVerificationTokens) {
      (db.data as any).loginVerificationTokens = [];
    }

    (db.data as any).loginVerificationTokens = (db.data as any).loginVerificationTokens.map((t: any) =>
      t.user_id === user.id && !t.used_at ? { ...t, used_at: new Date().toISOString() } : t
    );

    (db.data as any).loginVerificationTokens.push({
      id: crypto.randomUUID(),
      user_id: user.id,
      token_hash: tokenHash,
      ip_address: context?.ipAddress || null,
      user_agent: context?.userAgent || null,
      expires_at: expiresAt,
      used_at: null,
      created_at: new Date().toISOString(),
    });

    await dbHelpers.write();

    return {
      requiresFirstLoginVerification: true as const,
      verificationToken: rawToken,
      user: stripPassword(user),
    };
  }

  const cleanUser = stripPassword(user);
  const token = generateToken({
    userId: cleanUser.id,
    email: cleanUser.email,
    role: cleanUser.role,
    employeeId: cleanUser.employeeId,
  });

  return { user: cleanUser, token };
};

export const getUserById = async (userId: string) => {
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const rows = await sql`select * from users where id = ${userId} limit 1`;
    if (!rows[0]) return null;
    return stripPassword(rows[0]);
  }

  await dbHelpers.read();
  const db = getDatabase();
  const user = db.data.users.find((u) => u.id === userId);
  if (!user) return null;
  return stripPassword(user);
};

const hashResetToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const requestPasswordReset = async (email: string) => {
  const normalizedEmail = email.toLowerCase();
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const users = await sql`select id, email, name from users where lower(email) = ${normalizedEmail} limit 1`;
    const user = users[0];
    if (!user) return null;

    await sql`
      update password_reset_tokens set used_at = now()
      where user_id = ${user.id} and used_at is null
    `;

    await sql`
      insert into password_reset_tokens (user_id, token_hash, expires_at)
      values (${user.id}, ${tokenHash}, ${expiresAt})
    `;

    return { token: rawToken, user };
  }

  await dbHelpers.read();
  const db = getDatabase();
  const user = db.data.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user) return null;

  if (!(db.data as any).passwordResetTokens) {
    (db.data as any).passwordResetTokens = [];
  }

  (db.data as any).passwordResetTokens = (db.data as any).passwordResetTokens.map((t: any) =>
    t.user_id === user.id && !t.used_at ? { ...t, used_at: new Date().toISOString() } : t
  );

  (db.data as any).passwordResetTokens.push({
    id: crypto.randomUUID(),
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
    used_at: null,
    created_at: new Date().toISOString(),
  });

  await dbHelpers.write();
  return { token: rawToken, user: { id: user.id, email: user.email, name: user.name } };
};

export const resetPasswordWithToken = async (token: string, newPassword: string) => {
  const tokenHash = hashResetToken(token);

  if (isSupabaseEnabled) {
    const sql = getSql()!;

    const tokens = await sql`
      select id, user_id, expires_at, used_at from password_reset_tokens
      where token_hash = ${tokenHash} limit 1
    `;
    const tokenRow = tokens[0];

    if (!tokenRow || tokenRow.used_at || new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return false;
    }

    const newHash = await hashPassword(newPassword);

    await sql`update users set password = ${newHash}, password_must_change = false where id = ${tokenRow.user_id}`;
    await sql`update password_reset_tokens set used_at = now() where id = ${tokenRow.id}`;

    return true;
  }

  await dbHelpers.read();
  const db = getDatabase();
  const tokensList = ((db.data as any).passwordResetTokens || []) as any[];
  const tokenRow = tokensList.find((t) => t.token_hash === tokenHash);

  if (!tokenRow || tokenRow.used_at || new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return false;
  }

  const userIndex = db.data.users.findIndex((u) => u.id === tokenRow.user_id);
  if (userIndex === -1) return false;

  db.data.users[userIndex].password = await hashPassword(newPassword);
  db.data.users[userIndex].password_must_change = false;
  db.data.users[userIndex].updated_at = new Date().toISOString();
  tokenRow.used_at = new Date().toISOString();
  await dbHelpers.write();

  return true;
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const users = await sql`
      select id, email, password, first_login_verified
      from users
      where id = ${userId}
      limit 1
    `;
    const user = users[0];
    if (!user) return { success: false as const, error: "User not found" };
    if (
      String(user.email || "").toLowerCase() === ADMIN_FIRST_LOGIN_EMAIL &&
      !Boolean(user.first_login_verified)
    ) {
      return { success: false as const, error: "Complete email verification before changing password" };
    }

    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) return { success: false as const, error: "Current password is incorrect" };

    const newHash = await hashPassword(newPassword);
    await sql`
      update users
      set password = ${newHash}, password_must_change = false
      where id = ${userId}
    `;
    return { success: true as const };
  }

  await dbHelpers.read();
  const db = getDatabase();
  const idx = db.data.users.findIndex((u) => u.id === userId);
  if (idx === -1) return { success: false as const, error: "User not found" };
  if (
    String((db.data.users[idx] as any).email || "").toLowerCase() === ADMIN_FIRST_LOGIN_EMAIL &&
    !Boolean((db.data.users[idx] as any).first_login_verified)
  ) {
    return { success: false as const, error: "Complete email verification before changing password" };
  }

  const isValid = await comparePassword(currentPassword, db.data.users[idx].password);
  if (!isValid) return { success: false as const, error: "Current password is incorrect" };

  db.data.users[idx].password = await hashPassword(newPassword);
  db.data.users[idx].password_must_change = false;
  db.data.users[idx].updated_at = new Date().toISOString();
  await dbHelpers.write();
  return { success: true as const };
};

export const verifyFirstLoginToken = async (token: string) => {
  const tokenHash = hashLoginVerifyToken(token);

  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const rows = await sql`
      select id, user_id, expires_at, used_at
      from login_verification_tokens
      where token_hash = ${tokenHash}
      limit 1
    `;
    const tokenRow = rows[0];
    if (!tokenRow) return null;
    if (tokenRow.used_at || new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return null;
    }

    await sql`update login_verification_tokens set used_at = now() where id = ${tokenRow.id}`;
    await sql`
      update users
      set first_login_verified = true, first_login_verified_at = now()
      where id = ${tokenRow.user_id}
    `;

    const users = await sql`select * from users where id = ${tokenRow.user_id} limit 1`;
    const user = users[0];
    if (!user) return null;

    const cleanUser = stripPassword(user);
    const authToken = generateToken({
      userId: cleanUser.id,
      email: cleanUser.email,
      role: cleanUser.role,
      employeeId: cleanUser.employeeId,
    });

    return { user: cleanUser, token: authToken };
  }

  await dbHelpers.read();
  const db = getDatabase();
  const tokens = ((db.data as any).loginVerificationTokens || []) as any[];
  const tokenRow = tokens.find((t) => t.token_hash === tokenHash);
  if (!tokenRow || tokenRow.used_at || new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return null;
  }

  tokenRow.used_at = new Date().toISOString();
  const idx = db.data.users.findIndex((u) => u.id === tokenRow.user_id);
  if (idx === -1) return null;

  db.data.users[idx].first_login_verified = true;
  db.data.users[idx].first_login_verified_at = new Date().toISOString();
  await dbHelpers.write();

  const cleanUser = stripPassword(db.data.users[idx]);
  const authToken = generateToken({
    userId: cleanUser.id,
    email: cleanUser.email,
    role: cleanUser.role,
    employeeId: cleanUser.employeeId,
  });
  return { user: cleanUser, token: authToken };
};
