/**
 * Normalizes JSON from the invite onboarding form so it matches `employeeSchema`
 * (camelCase, numeric salary, no extra keys, optional fields as undefined not "").
 */
export function normalizeInviteEmployeeBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const b = { ...(body as Record<string, unknown>) };

  delete b.documents;
  delete b.id;
  delete b.initials;

  const sal = b.salary;
  if (sal === "" || sal === null) {
    delete b.salary;
  } else if (typeof sal === "string" && sal.trim() !== "") {
    const n = Number(sal);
    if (!Number.isNaN(n)) b.salary = n;
  } else if (typeof sal === "number" && Number.isNaN(sal)) {
    delete b.salary;
  }

  const optionalKeys = [
    "phone",
    "language",
    "ninNumber",
    "bvn",
    "dateOfBirth",
    "gender",
    "address",
    "grade",
    "level",
  ];
  for (const k of optionalKeys) {
    if (b[k] === "") b[k] = undefined;
  }

  if (b.gender === "") b.gender = undefined;

  if (b.nextOfKin && typeof b.nextOfKin === "object") {
    const nk = { ...(b.nextOfKin as Record<string, unknown>) };
    for (const k of ["name", "relationship", "phone", "address"]) {
      if (nk[k] === "") nk[k] = undefined;
    }
    const hasAny = ["name", "relationship", "phone", "address"].some(
      (k) => nk[k] !== undefined && nk[k] !== null && String(nk[k]).trim() !== ""
    );
    if (!hasAny) {
      delete b.nextOfKin;
    } else {
      b.nextOfKin = nk;
    }
  }

  return b;
}
