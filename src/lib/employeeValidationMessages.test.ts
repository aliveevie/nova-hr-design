import { describe, it, expect } from "vitest";
import {
  buildFriendlyValidationResult,
  extractConflictFieldFromApiError,
  extractValidationIssuesFromApiError,
  fieldElementIdForPath,
  fieldLabelForPath,
  friendlyLineForIssue,
  friendlyGenericSubmitError,
} from "./employeeValidationMessages";

describe("employeeValidationMessages", () => {
  it("maps department required to plain language", () => {
    const line = friendlyLineForIssue({
      path: ["department"],
      message: "String must contain at least 1 character(s)",
      code: "too_small",
    });
    expect(line).toContain("Department");
    expect(line.toLowerCase()).toMatch(/required|complete|fill/);
  });

  it("maps salary positive number", () => {
    const line = friendlyLineForIssue({
      path: ["salary"],
      message: "Number must be greater than 0",
      code: "too_small",
    });
    expect(line).toContain("Salary");
    expect(line.toLowerCase()).toMatch(/number|greater|zero/);
  });

  it("maps email invalid", () => {
    const line = friendlyLineForIssue({
      path: ["email"],
      message: "Invalid email",
      code: "invalid_string",
    });
    expect(line).toContain("Email");
    expect(line).toMatch(/@|email/);
  });

  it("maps next of kin nested path", () => {
    expect(fieldLabelForPath(["nextOfKin", "phone"])).toContain("Next of kin");
    expect(fieldElementIdForPath(["nextOfKin", "phone"])).toBe("nokPhone");
  });

  it("buildFriendlyValidationResult provides firstFieldId", () => {
    const { lines, firstFieldId } = buildFriendlyValidationResult([
      { path: ["department"], message: "Required" },
    ]);
    expect(lines.length).toBe(1);
    expect(firstFieldId).toBe("department");
  });

  it("extractValidationIssuesFromApiError reads details.details", () => {
    const err = new Error("Validation failed") as Error & {
      details?: { error?: string; details?: unknown };
    };
    err.details = {
      error: "Validation failed",
      details: [{ path: ["jobTitle"], message: "Required" }],
    };
    const issues = extractValidationIssuesFromApiError(err);
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toEqual(["jobTitle"]);
  });

  it("friendlyGenericSubmitError handles network", () => {
    const err = new Error("Failed to fetch") as Error & { status?: number };
    err.status = 0;
    expect(friendlyGenericSubmitError(err)).toMatch(/connection|internet/i);
  });

  it("extractConflictFieldFromApiError maps 409 duplicate email", () => {
    const err = new Error(
      "This email address is already registered. Use a different email, or sign in with your existing account."
    ) as Error & { details?: { error?: string; code?: string; field?: string }; status?: number };
    err.status = 409;
    err.details = {
      error: err.message,
      code: "EMAIL_ALREADY_EXISTS",
      field: "email",
    };
    const c = extractConflictFieldFromApiError(err);
    expect(c?.fieldId).toBe("email");
    expect(c?.message).toContain("already registered");
  });

  it("friendlyGenericSubmitError prefers server message for 409", () => {
    const err = new Error("Duplicate") as Error & {
      details?: { error?: string };
      status?: number;
    };
    err.status = 409;
    err.details = { error: "Email already taken." };
    expect(friendlyGenericSubmitError(err)).toBe("Email already taken.");
  });
});
