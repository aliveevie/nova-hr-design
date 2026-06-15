import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRIDGE_DIR = join(__dirname, "../../scripts/fingerprint-bridge");

type EnrollResult =
  | { success: true; finger: string; device_name: string; template_b64: string }
  | { success: false; error: string };

type IdentifyResult =
  | { success: true; template_id: string; match_score: number | null; device_name: string }
  | { success: false; error: string };

const runPython = (script: string, args: string[] = [], stdin?: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [join(BRIDGE_DIR, script), ...args], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d) => {
      const text = d.toString();
      stderr += text;
      // Forward live capture progress (e.g. "PROGRESS 1") to the server log.
      process.stderr.write(`[fp-bridge] ${text}`);
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(stderr || `fingerprint bridge exited ${code}`));
        return;
      }
      resolve(stdout.trim());
    });
    if (stdin) {
      proc.stdin.write(stdin);
    }
    proc.stdin.end();
  });
};

export const captureFingerprintTemplate = async (
  fingerPosition: string
): Promise<EnrollResult> => {
  try {
    const out = await runPython("enroll.py", [fingerPosition]);
    return JSON.parse(out) as EnrollResult;
  } catch (e: any) {
    return { success: false, error: e?.message || "bridge_unavailable" };
  }
};

export const identifyFingerprint = async (
  templates: Array<{ id: string; template_b64: string }>
): Promise<IdentifyResult> => {
  try {
    const stdin = JSON.stringify({ templates });
    const out = await runPython("identify.py", [], stdin);
    return JSON.parse(out) as IdentifyResult;
  } catch (e: any) {
    return { success: false, error: e?.message || "bridge_unavailable" };
  }
};

export const getScannerBridgeStatus = async (): Promise<{
  available: boolean;
  device_name?: string;
  error?: string;
}> => {
  try {
    const out = await runPython("status.py", []);
    return JSON.parse(out);
  } catch (e: any) {
    return { available: false, error: e?.message || "bridge_unavailable" };
  }
};

export const FINGER_POSITIONS = [
  { value: "right-index-finger", label: "Right index finger" },
  { value: "left-index-finger", label: "Left index finger" },
  { value: "right-thumb", label: "Right thumb" },
  { value: "left-thumb", label: "Left thumb" },
] as const;

export const MAX_FINGERS_PER_EMPLOYEE = 3;

/** Recommended enrollment order (up to 3 fingers). */
export const RECOMMENDED_FINGER_POSITIONS = [
  {
    value: "right-index-finger",
    label: "Right index finger",
    step: 1,
    hint: "Place your right index finger flat on the scanner and hold still until the LED stops flashing.",
  },
  {
    value: "right-thumb",
    label: "Right thumb",
    step: 2,
    hint: "Lift your finger, then place your right thumb on the scanner.",
  },
  {
    value: "left-index-finger",
    label: "Left index finger",
    step: 3,
    hint: "Finally, place your left index finger on the scanner to complete enrollment.",
  },
] as const;
