import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Location of the SourceAFIS matcher fat-jar. Overridable via env for
 * deployments where the jar lives elsewhere. Defaults to the build output of
 * `backend/fingerprint-matcher`.
 */
const JAR_PATH =
  process.env.FINGERPRINT_MATCHER_JAR ||
  join(__dirname, "../../fingerprint-matcher/target/fingerprint-matcher.jar");

const JAVA_BIN = process.env.JAVA_BIN || "java";

/**
 * DPI reported by the DigitalPersona U.are.U 4500 PNG capture. Configurable so
 * it can be tuned per reader model without a rebuild.
 */
export const FINGERPRINT_DPI = Number(process.env.FINGERPRINT_DPI || 500);

/** Score at/above which SourceAFIS considers two prints the same finger. */
export const FINGERPRINT_MATCH_THRESHOLD = Number(process.env.FINGERPRINT_MATCH_THRESHOLD || 40);

export type ExtractResult =
  | { success: true; template_b64: string }
  | { success: false; error: string };

export type MatcherIdentifyResult =
  | { success: true; template_id: string; score: number }
  | { success: false; error: string; best_score?: number };

const runMatcher = (command: string, stdin?: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const proc = spawn(JAVA_BIN, ["-jar", JAR_PATH, command], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(stderr || `fingerprint matcher exited ${code}`));
        return;
      }
      resolve(stdout.trim());
    });
    if (stdin) proc.stdin.write(stdin);
    proc.stdin.end();
  });
};

/** Extracts a SourceAFIS template (base64) from a captured PNG (base64). */
export const extractTemplateFromImage = async (
  imageB64: string,
  dpi: number = FINGERPRINT_DPI
): Promise<ExtractResult> => {
  try {
    const out = await runMatcher("extract", JSON.stringify({ imageB64, dpi }));
    return JSON.parse(out) as ExtractResult;
  } catch (e: any) {
    return { success: false, error: e?.message || "matcher_unavailable" };
  }
};

/**
 * 1:N identify: extracts the probe from a PNG and matches it against a gallery
 * of previously stored SourceAFIS templates. All matching runs server-side.
 */
export const identifyAgainstGallery = async (
  probeImageB64: string,
  gallery: Array<{ id: string; template_b64: string }>,
  opts: { dpi?: number; threshold?: number } = {}
): Promise<MatcherIdentifyResult> => {
  try {
    const out = await runMatcher(
      "identify",
      JSON.stringify({
        probeImageB64,
        dpi: opts.dpi ?? FINGERPRINT_DPI,
        threshold: opts.threshold ?? FINGERPRINT_MATCH_THRESHOLD,
        gallery,
      })
    );
    return JSON.parse(out) as MatcherIdentifyResult;
  } catch (e: any) {
    return { success: false, error: e?.message || "matcher_unavailable" };
  }
};

export const getMatcherStatus = async (): Promise<{
  available: boolean;
  engine?: string;
  error?: string;
}> => {
  if (!fs.existsSync(JAR_PATH)) {
    return { available: false, error: `matcher_jar_missing: ${JAR_PATH}` };
  }
  try {
    const out = await runMatcher("status");
    const parsed = JSON.parse(out);
    return { available: Boolean(parsed.available), engine: parsed.engine };
  } catch (e: any) {
    return { available: false, error: e?.message || "matcher_unavailable" };
  }
};

export const SOURCEAFIS_TEMPLATE_FORMAT = "sourceafis-3";
