// Cross-browser, cross-device location fall-back utilities.
//
// Browser geolocation varies wildly between Chrome/Firefox/Safari and between
// phones (GPS) vs laptops (Wi-Fi triangulation). The source IP of an HTTP
// request, on the other hand, is a stable property of the network the
// employee is actually connected to: all staff on the office Wi-Fi/LAN share
// the same public egress IP regardless of the browser they use. We therefore
// let admins pin a list of office IPs/CIDRs/prefixes and accept a check-in
// whenever the request originates from one of them.

import { Request } from "express";

/**
 * Extract the best-effort source IP from a request, honouring common proxy
 * headers used by Vercel, Cloudflare, Nginx and similar infrastructure. We
 * only consult the *first* hop in `x-forwarded-for`, which is the client.
 */
export function getSourceIp(req: Request): string | null {
  const headerCandidates = [
    "cf-connecting-ip",
    "x-real-ip",
    "x-vercel-forwarded-for",
    "x-forwarded-for",
  ];
  for (const h of headerCandidates) {
    const raw = req.headers[h];
    if (!raw) continue;
    const val = Array.isArray(raw) ? raw[0] : raw;
    const first = String(val).split(",")[0]?.trim();
    if (first) return normalizeIp(first);
  }
  return normalizeIp(req.ip || (req.socket?.remoteAddress ?? null));
}

function normalizeIp(ip: string | null): string | null {
  if (!ip) return null;
  // Strip IPv6 mapping prefix so "::ffff:203.0.113.5" compares as "203.0.113.5"
  const m = /^::ffff:(.+)$/.exec(ip);
  return m ? m[1] : ip;
}

function ipV4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const b = Number(p);
    if (!Number.isFinite(b) || b < 0 || b > 255) return null;
    n = (n << 8) + b;
  }
  return n >>> 0;
}

/**
 * Case-insensitive, whitespace-trimming SSID match. Browsers cannot read
 * the SSID themselves; the employee claims it once and the server verifies
 * the claim against the admin-pinned list. Returns null-safe.
 */
export function ssidMatchesAllowlist(
  ssid: string | null | undefined,
  allowlist: readonly string[] | null | undefined
): boolean {
  if (!ssid || !allowlist || allowlist.length === 0) return false;
  const needle = String(ssid).trim().toLowerCase();
  if (!needle) return false;
  for (const raw of allowlist) {
    if (String(raw || "").trim().toLowerCase() === needle) return true;
  }
  return false;
}

/**
 * Returns true when `ip` matches any entry in `allowlist`. Each entry may be:
 *   • an exact IPv4/IPv6 address  (e.g. "203.0.113.5")
 *   • a CIDR range                (e.g. "203.0.113.0/24")
 *   • a simple glob prefix        (e.g. "203.0.113.*")
 * IPv6 only supports exact match — offices rarely need subnet matching there.
 */
export function ipMatchesAllowlist(ip: string | null, allowlist: readonly string[] | null | undefined): boolean {
  if (!ip || !allowlist || allowlist.length === 0) return false;
  const target = ip.trim();
  const targetV4 = ipV4ToInt(target);
  for (const raw of allowlist) {
    const entry = String(raw || "").trim();
    if (!entry) continue;
    if (entry === target) return true;
    if (entry.endsWith(".*")) {
      const prefix = entry.slice(0, -1); // keep trailing dot
      if (target.startsWith(prefix)) return true;
      continue;
    }
    const slash = entry.indexOf("/");
    if (slash !== -1 && targetV4 != null) {
      const base = entry.slice(0, slash);
      const bits = Number(entry.slice(slash + 1));
      const baseV4 = ipV4ToInt(base);
      if (baseV4 == null || !Number.isFinite(bits) || bits < 0 || bits > 32) continue;
      if (bits === 0) return true;
      const mask = bits === 32 ? 0xffffffff : (~0 << (32 - bits)) >>> 0;
      if ((baseV4 & mask) === (targetV4 & mask)) return true;
    }
  }
  return false;
}
