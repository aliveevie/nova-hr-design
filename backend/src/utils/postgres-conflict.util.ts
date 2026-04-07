/**
 * Map Postgres unique violations (23505) to stable API responses for public onboarding.
 */

export type PublicInviteConflictBody = {
  error: string;
  code: string;
  field?: string;
};

/** Postgres `postgres` driver errors include `code` and `constraint_name` */
export function mapUniqueViolationToPublicInviteResponse(e: unknown): {
  status: number;
  body: PublicInviteConflictBody;
} | null {
  const pg = e as { code?: string; constraint_name?: string };
  if (pg.code !== "23505") return null;

  const c = String(pg.constraint_name ?? "");

  if (c.includes("employees_email") || c.includes("users_email")) {
    return {
      status: 409,
      body: {
        error:
          "This email address is already registered. Use a different email, or sign in with your existing account.",
        code: "EMAIL_ALREADY_EXISTS",
        field: "email",
      },
    };
  }

  if (c.includes("nin_number")) {
    return {
      status: 409,
      body: {
        error:
          "This National Identification Number (NIN) is already on file. Enter the correct NIN for your profile.",
        code: "NIN_ALREADY_EXISTS",
        field: "ninNumber",
      },
    };
  }

  if (c.includes("bvn")) {
    return {
      status: 409,
      body: {
        error:
          "This BVN is already on file. Enter the correct BVN for your profile.",
        code: "BVN_ALREADY_EXISTS",
        field: "bvn",
      },
    };
  }

  return {
    status: 409,
    body: {
      error:
        "Some of the information you entered is already in use. Please review your details and try again.",
      code: "DUPLICATE_VALUE",
    },
  };
}
