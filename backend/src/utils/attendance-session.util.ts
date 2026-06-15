import type { OfficeLocationRow } from "../services/attendance.service.js";

export const parseHHMM = (v: string): number | null => {
  const m = /^(\d{2}):(\d{2})$/.exec(String(v || ""));
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
};

export const getDateInTimeZone = (timeZone: string, d = new Date()): string => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
};

export const getNowMinutesInTimeZone = (timeZone: string, d = new Date()): number | null => {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const hh = Number(parts.find((p) => p.type === "hour")?.value);
    const mm = Number(parts.find((p) => p.type === "minute")?.value);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return hh * 60 + mm;
  } catch {
    return null;
  }
};

export const isWithinOfficeHours = (args: {
  nowMin: number;
  openMin: number;
  closeMin: number;
}): boolean => {
  const { nowMin, openMin, closeMin } = args;
  if (openMin === closeMin) return true;
  if (openMin < closeMin) return nowMin >= openMin && nowMin <= closeMin;
  return nowMin >= openMin || nowMin <= closeMin;
};

export type AttendanceSessionState = {
  isOpen: boolean;
  mode: "manual" | "auto" | "closed";
  todayInOfficeTz: string;
  openTime: string;
  closeTime: string;
  timeZone: string;
  autoStartEnabled: boolean;
  manuallyStarted: boolean;
  message: string;
};

export const computeAttendanceSessionState = (
  office: OfficeLocationRow | null | undefined,
  viewDate: string,
  now = new Date()
): AttendanceSessionState => {
  const timeZone = office?.time_zone || "Africa/Lagos";
  const openTime = office?.open_time || "09:00";
  const closeTime = office?.close_time || "17:00";
  const todayInOfficeTz = getDateInTimeZone(timeZone, now);
  const autoStartEnabled = office?.auto_start_enabled !== false;

  if (!office || !office.enabled) {
    return {
      isOpen: false,
      mode: "closed",
      todayInOfficeTz,
      openTime,
      closeTime,
      timeZone,
      autoStartEnabled,
      manuallyStarted: false,
      message: "Configure office hours to enable attendance.",
    };
  }

  if (viewDate !== todayInOfficeTz) {
    return {
      isOpen: false,
      mode: "closed",
      todayInOfficeTz,
      openTime,
      closeTime,
      timeZone,
      autoStartEnabled,
      manuallyStarted: false,
      message: "Viewing a past or future date.",
    };
  }

  const openMin = parseHHMM(openTime) ?? 0;
  const closeMin = parseHHMM(closeTime) ?? 23 * 60 + 59;
  const nowMin = getNowMinutesInTimeZone(timeZone, now);
  const withinHours =
    nowMin != null ? isWithinOfficeHours({ nowMin, openMin, closeMin }) : false;

  const pastClose =
    nowMin != null && openMin < closeMin && nowMin > closeMin;

  const manualActive =
    !!office.session_open &&
    String(office.session_date || "") === todayInOfficeTz &&
    !pastClose;

  const autoActive = autoStartEnabled && withinHours;

  if (manualActive) {
    return {
      isOpen: true,
      mode: "manual",
      todayInOfficeTz,
      openTime,
      closeTime,
      timeZone,
      autoStartEnabled,
      manuallyStarted: true,
      message: "Attendance started manually by admin.",
    };
  }

  if (autoActive) {
    return {
      isOpen: true,
      mode: "auto",
      todayInOfficeTz,
      openTime,
      closeTime,
      timeZone,
      autoStartEnabled,
      manuallyStarted: false,
      message: `Attendance open automatically (${openTime}–${closeTime}).`,
    };
  }

  if (!withinHours) {
    return {
      isOpen: false,
      mode: "closed",
      todayInOfficeTz,
      openTime,
      closeTime,
      timeZone,
      autoStartEnabled,
      manuallyStarted: false,
      message: `Outside office hours (${openTime}–${closeTime}).`,
    };
  }

  return {
    isOpen: false,
    mode: "closed",
    todayInOfficeTz,
    openTime,
    closeTime,
    timeZone,
    autoStartEnabled,
    manuallyStarted: false,
    message: "Attendance not started — click Start attendance or wait for auto-start at open time.",
  };
};

export const isAttendanceOpenForCheckIn = (
  office: OfficeLocationRow | null | undefined,
  now = new Date()
): boolean => {
  const tz = office?.time_zone || "Africa/Lagos";
  const today = getDateInTimeZone(tz, now);
  return computeAttendanceSessionState(office, today, now).isOpen;
};

export const deriveLateStatus = (
  checkInTime: string,
  openTime: string
): "Present" | "Late" => {
  const checkMin = parseHHMM(checkInTime);
  const openMin = parseHHMM(openTime);
  if (checkMin == null || openMin == null) return "Present";
  return checkMin > openMin ? "Late" : "Present";
};

export const DEFAULT_OPEN_TIME = "09:00";
export const DEFAULT_CLOSE_TIME = "17:00";
export const DEFAULT_TIME_ZONE = "Africa/Lagos";

export const toTimeHHMMInTimeZone = (timeZone: string, d = new Date()): string => {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
    const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
    return `${hh}:${mm}`;
  } catch {
    return toTimeHHMMLocal(d);
  }
};

const toTimeHHMMLocal = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** Fingerprint scans allowed during office hours (default 09:00–17:00). */
export const isFingerprintScanAllowed = (
  office: OfficeLocationRow | null | undefined,
  now = new Date()
): boolean => {
  const timeZone = office?.time_zone || DEFAULT_TIME_ZONE;
  const openTime = office?.open_time || DEFAULT_OPEN_TIME;
  const closeTime = office?.close_time || DEFAULT_CLOSE_TIME;
  const openMin = parseHHMM(openTime);
  const closeMin = parseHHMM(closeTime);
  const nowMin = getNowMinutesInTimeZone(timeZone, now);
  if (openMin == null || closeMin == null || nowMin == null) return false;
  return isWithinOfficeHours({ nowMin, openMin, closeMin });
};

export const isPastCloseTime = (
  office: OfficeLocationRow | null | undefined,
  now = new Date()
): boolean => {
  const timeZone = office?.time_zone || DEFAULT_TIME_ZONE;
  const closeTime = office?.close_time || DEFAULT_CLOSE_TIME;
  const closeMin = parseHHMM(closeTime);
  const nowMin = getNowMinutesInTimeZone(timeZone, now);
  if (closeMin == null || nowMin == null) return false;
  const openMin = parseHHMM(office?.open_time || DEFAULT_OPEN_TIME) ?? 0;
  if (openMin < closeMin) return nowMin > closeMin;
  return false;
};
