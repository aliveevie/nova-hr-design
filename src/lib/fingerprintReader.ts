// Browser-side fingerprint capture using the HID DigitalPersona WebSDK.
//
// This talks to the DigitalPersona client (the free "Lite Client" / driver the
// user installs once on their own machine) and captures a fingerprint as a PNG
// image. The PNG is then sent to our cloud backend, which extracts a template
// and matches it with SourceAFIS. Nothing else runs on the user's device.

import {
  FingerprintReader,
  SampleFormat,
  type DeviceConnected,
  type DeviceDisconnected,
  type SamplesAcquired,
} from "@digitalpersona/devices";
import { Base64 } from "@digitalpersona/core";

export type CaptureResult = {
  /** Standard base64 (not base64url) PNG image data, no data-URI prefix. */
  imageB64: string;
};

/** Where users download the free DigitalPersona client (the "driver"). */
export const LITE_CLIENT_DOWNLOAD_URL = "https://digitalpersona.hidglobal.com/lite-client/";

export class FingerprintReaderError extends Error {
  code:
    | "NO_CLIENT" // DigitalPersona client/agent not installed or not running
    | "NO_READER" // client running but no reader plugged in
    | "CAPTURE_FAILED"
    | "TIMEOUT";
  constructor(message: string, code: FingerprintReaderError["code"]) {
    super(message);
    this.code = code;
  }
}

/** Convert base64url (WebSDK) to standard base64 for JSON transport. */
const toStandardBase64 = (b64url: string): string => {
  if (!b64url) return "";
  let s = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "=".repeat(4 - pad);
  return s;
};

/** Returns reader device IDs available through the local DigitalPersona client. */
export const listReaders = async (): Promise<string[]> => {
  const reader = new FingerprintReader();
  try {
    const devices = await reader.enumerateDevices();
    return Array.isArray(devices) ? devices : [];
  } catch {
    throw new FingerprintReaderError(
      "DigitalPersona client not detected on this device.",
      "NO_CLIENT"
    );
  }
};

/**
 * Waits for one finger to be placed on the reader and resolves with the PNG.
 * Rejects with a FingerprintReaderError if the client/reader is missing or the
 * user does not present a finger within `timeoutMs`.
 */
export const captureFingerprintImage = (timeoutMs = 20000): Promise<CaptureResult> => {
  return new Promise<CaptureResult>((resolve, reject) => {
    const reader = new FingerprintReader();
    let settled = false;
    let timer: number | undefined;

    const cleanup = () => {
      if (timer) window.clearTimeout(timer);
      try {
        reader.stopAcquisition();
      } catch {
        /* ignore */
      }
      reader.onSamplesAcquired = undefined;
      reader.onDeviceDisconnected = undefined;
      reader.onErrorOccurred = undefined;
    };

    const fail = (err: FingerprintReaderError) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const succeed = (result: CaptureResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    reader.onSamplesAcquired = (event: SamplesAcquired) => {
      try {
        // For SampleFormat.PngImage, `samples` is a JSON string array of
        // base64url-encoded PNG images (per HID docs / issues #11, #21).
        const samples =
          typeof event.samples === "string" ? JSON.parse(event.samples) : event.samples;
        const first = Array.isArray(samples) ? samples[0] : samples;
        const raw =
          typeof first === "string" ? first : (first && (first as { Data?: string }).Data) || "";
        if (!raw) {
          fail(new FingerprintReaderError("No fingerprint sample captured.", "CAPTURE_FAILED"));
          return;
        }
        let imageB64: string;
        try {
          imageB64 = Base64.fromBase64Url(raw);
        } catch {
          imageB64 = toStandardBase64(raw);
        }
        succeed({ imageB64 });
      } catch {
        fail(new FingerprintReaderError("Failed to read fingerprint sample.", "CAPTURE_FAILED"));
      }
    };

    reader.onDeviceConnected = (_e: DeviceConnected) => {
      /* reader plugged in mid-session; nothing to do */
    };
    reader.onDeviceDisconnected = (_e: DeviceDisconnected) => {
      fail(new FingerprintReaderError("Fingerprint reader was disconnected.", "NO_READER"));
    };
    reader.onErrorOccurred = () => {
      fail(new FingerprintReaderError("Fingerprint reader error.", "CAPTURE_FAILED"));
    };

    reader
      .startAcquisition(SampleFormat.PngImage)
      .then(() => {
        timer = window.setTimeout(() => {
          fail(
            new FingerprintReaderError(
              "No finger detected. Place the finger on the reader and try again.",
              "TIMEOUT"
            )
          );
        }, timeoutMs);
      })
      .catch((err: unknown) => {
        const msg = String((err as Error)?.message || err || "");
        fail(
          new FingerprintReaderError(
            "Could not reach the DigitalPersona client. Install the driver/Lite Client and plug in the reader.",
            /reader|device/i.test(msg) ? "NO_READER" : "NO_CLIENT"
          )
        );
      });
  });
};
