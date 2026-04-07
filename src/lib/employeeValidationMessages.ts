/**
 * Turns API / Zod validation issues into plain-language guidance for staff onboarding
 * and employee forms (field labels users see on the page, not raw JSON paths).
 */

export type ValidationIssueLike = {
  path?: (string | number)[];
  message?: string;
  code?: string;
};

/** Response body shape from `POST .../submit` on validation failure */
export type ApiErrorPayload = {
  error?: string;
  details?: ValidationIssueLike[];
};

/** 409 conflict — duplicate email, NIN, BVN, etc. */
export type ApiConflictPayload = {
  error?: string;
  code?: string;
  field?: string;
};

export function extractValidationIssuesFromApiError(
  err: Error & { details?: ApiErrorPayload; status?: number }
): ValidationIssueLike[] {
  const payload = err.details;
  if (!payload || !Array.isArray(payload.details)) return [];
  return payload.details;
}

/**
 * Duplicate email / unique constraint (HTTP 409) — show inline banner + scroll to field.
 */
export function extractConflictFieldFromApiError(
  err: Error & { details?: ApiConflictPayload; status?: number }
): { message: string; fieldId?: string } | null {
  if (err.status !== 409) return null;
  const d = err.details;
  if (!d || typeof d !== "object") return null;
  const message =
    typeof d.error === "string" ? d.error : (err.message || "").trim();
  if (!message) return null;

  const field = typeof d.field === "string" ? d.field : undefined;
  const fieldIdMap: Record<string, string> = {
    email: "email",
    ninNumber: "ninNumber",
    bvn: "bvn",
  };
  const fieldId = field ? fieldIdMap[field] ?? field : undefined;
  return { message, fieldId };
}

/** Human-readable label matching form labels in EmployeeForm */
export function fieldLabelForPath(path: (string | number)[]): string {
  const p = path.map(String);
  if (p.length === 0) return "Form";

  if (p[0] === "nextOfKin" && p[1]) {
    const sub: Record<string, string> = {
      name: "Next of kin — name",
      relationship: "Next of kin — relationship",
      phone: "Next of kin — phone",
      address: "Next of kin — address",
    };
    return sub[p[1]] ?? `Next of kin (${p[1]})`;
  }

  const top = p[0];
  const map: Record<string, string> = {
    name: "Full name",
    email: "Email address",
    phone: "Phone number",
    language: "Language",
    ninNumber: "National Identification Number (NIN)",
    bvn: "BVN",
    dateOfBirth: "Date of birth",
    gender: "Gender",
    address: "Address",
    department: "Department",
    jobTitle: "Job title",
    grade: "Grade",
    level: "Level",
    status: "Employment status",
    joinDate: "Join date",
    salary: "Salary",
    nextOfKin: "Next of kin",
  };
  return map[top] ?? top.replace(/([A-Z])/g, " $1").trim();
}

/**
 * `id` of the input/select to scroll to (matches EmployeeForm element ids).
 */
export function fieldElementIdForPath(path: (string | number)[]): string | undefined {
  const p = path.map(String);
  if (p[0] === "nextOfKin" && p[1]) {
    const m: Record<string, string> = {
      name: "nokName",
      relationship: "nokRelationship",
      phone: "nokPhone",
      address: "nokAddress",
    };
    return m[p[1]];
  }
  const m: Record<string, string> = {
    name: "name",
    email: "email",
    phone: "phone",
    language: "language",
    ninNumber: "ninNumber",
    bvn: "bvn",
    dateOfBirth: "dateOfBirth",
    gender: "gender",
    address: "address",
    department: "department",
    jobTitle: "jobTitle",
    grade: "grade",
    level: "level",
    status: "status",
    joinDate: "joinDate",
    salary: "salary",
  };
  return m[p[0]];
}

export function friendlyLineForIssue(issue: ValidationIssueLike): string {
  const path = issue.path ?? [];
  const label = fieldLabelForPath(path);
  const msg = (issue.message ?? "").trim();
  const lower = msg.toLowerCase();
  const code = issue.code ?? "";

  if (code === "invalid_enum_value" || lower.includes("invalid enum")) {
    return `${label}: Choose one of the allowed options (use the dropdown if there is one).`;
  }

  if (path[path.length - 1] === "email" || path.includes("email")) {
    if (code === "invalid_string" || lower.includes("email")) {
      return `${label}: Enter a valid email address, for example name@company.com.`;
    }
  }

  if (path[path.length - 1] === "salary" || (path.length === 1 && path[0] === "salary")) {
    if (
      lower.includes("positive") ||
      lower.includes("greater") ||
      lower.includes("number") ||
      lower.includes("nan") ||
      lower.includes("expected number")
    ) {
      return `${label}: Enter your monthly salary as a number greater than zero (no letters or symbols).`;
    }
  }

  if (
    code === "invalid_type" ||
    lower.includes("required") ||
    lower.includes("cannot be empty") ||
    lower === "invalid input" ||
    (lower.includes("expected") && lower.includes("received undefined"))
  ) {
    return `${label}: This field is required. Please complete it before submitting.`;
  }

  if (code === "too_small") {
    const key = path[path.length - 1];
    if (
      key === "department" ||
      key === "jobTitle" ||
      key === "name" ||
      key === "phone" ||
      key === "joinDate"
    ) {
      return `${label}: This field is required. Please complete it before submitting.`;
    }
    if (lower.includes("string")) {
      return `${label}: Please enter at least the minimum number of characters.`;
    }
  }

  if (lower.includes("invalid date") || (path[path.length - 1] === "joinDate" && lower.includes("invalid"))) {
    return `${label}: Choose a valid date from the calendar.`;
  }

  // Fall back: still use the label, soften generic Zod wording
  if (msg && !/^expected /i.test(msg) && !/^invalid /i.test(msg)) {
    return `${label}: ${msg}`;
  }

  return `${label}: Please check this field and try again.`;
}

export function buildFriendlyValidationResult(issues: ValidationIssueLike[]): {
  lines: string[];
  firstFieldId?: string;
} {
  if (!issues.length) return { lines: [] };

  const lines = issues.map(friendlyLineForIssue);
  const firstId = fieldElementIdForPath(issues[0].path ?? []);

  return { lines, firstFieldId: firstId };
}

/** Non-validation API errors (network, 500, invite expired, etc.) */
export function friendlyGenericSubmitError(
  err: Error & { details?: ApiErrorPayload; status?: number }
): string {
  const status = err.status;
  const serverMsg = err.details?.error;

  if (status === 0 || err.message?.toLowerCase().includes("fetch")) {
    return "We could not reach the server. Check your internet connection and try again.";
  }
  if (status === 503 || status === 502) {
    return "The service is temporarily unavailable. Please try again in a few minutes.";
  }
  if (status === 401 || status === 403) {
    return "You do not have permission to complete this action. Open the invite link again or contact HR.";
  }
  if (status === 404) {
    return "This onboarding link was not found. Ask HR for a new invite link.";
  }
  if (status === 409) {
    return (
      serverMsg ||
      err.message ||
      "This information conflicts with an existing record. Review the highlighted fields and try again."
    );
  }
  if (status && status >= 500) {
    return "Something went wrong on our side. Please try again later or contact HR if it keeps happening.";
  }

  if (serverMsg && serverMsg !== "Validation failed") {
    return serverMsg;
  }

  return err.message || "Something went wrong. Please try again.";
}
