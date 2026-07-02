// Browser-side fingerprint capture using HID's official Fingerprint.WebApi
// (loaded from /vendor/fingerprint.sdk.min.js).

export type CaptureResult = {
  imageB64: string;
  dpi: number;
  format: "raw" | "png";
};

export type ReaderInfo = {
  deviceId: string;
  details: Record<string, unknown> | null;
};

export const LITE_CLIENT_DOWNLOAD_URL = "https://digitalpersona.hidglobal.com/lite-client/";
export const NON_WBF_DRIVER_URL = "https://www.hidglobal.com/drivers/49061";
export const LITE_CLIENT_TEST_URL = "https://127.0.0.1:52181/get_connection";

const DEFAULT_DEVICE_ID = "00000000-0000-0000-0000-000000000000";

export class FingerprintReaderError extends Error {
  code: "NO_CLIENT" | "NO_READER" | "CAPTURE_FAILED" | "TIMEOUT" | "WBF_DRIVER" | "BUSY";
  constructor(message: string, code: FingerprintReaderError["code"]) {
    super(message);
    this.code = code;
  }
}

type BioSampleLike = {
  Data?: string;
  Format?: {
    iWidth?: number;
    iHeight?: number;
    iXdpi?: number;
    iYdpi?: number;
    uSignificantBpp?: number;
    uBPP?: number;
    uPadding?: number;
  };
};

type CaptureTrace = {
  acquisitionStarted: boolean;
  qualityReported: boolean;
  samplesAcquired: boolean;
  errorOccurred: boolean;
  lastError?: number;
};

type ActiveCapture = { abort: () => void };

let activeCapture: ActiveCapture | null = null;

const getApi = (): Fingerprint.WebApi => {
  if (typeof Fingerprint === "undefined" || !Fingerprint.WebApi) {
    throw new FingerprintReaderError(
      "DigitalPersona browser SDK not loaded. Reload the page.",
      "NO_CLIENT"
    );
  }
  const g = globalThis as typeof globalThis & { __novaHrFpApi?: Fingerprint.WebApi };
  if (!g.__novaHrFpApi) g.__novaHrFpApi = new Fingerprint.WebApi();
  return g.__novaHrFpApi;
};

/** Stop an in-progress capture (e.g. user navigates away). */
export const cancelFingerprintCapture = (): void => {
  activeCapture?.abort();
  activeCapture = null;
};

const rawSampleToPngBase64 = (sample: BioSampleLike): { imageB64: string; dpi: number } => {
  const fmt = sample.Format;
  const width = fmt?.iWidth ?? 0;
  const height = fmt?.iHeight ?? 0;
  if (!sample.Data || !width || !height) {
    throw new Error("Invalid raw fingerprint sample.");
  }

  const b64 = Fingerprint.b64UrlTo64(sample.Data);
  const binary = atob(b64);
  const pixels = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) pixels[i] = binary.charCodeAt(i);

  const bpp = fmt?.uSignificantBpp ?? fmt?.uBPP ?? 8;
  const bytesPerPixel = Math.max(1, Math.round(bpp / 8));
  const rowPadding = fmt?.uPadding ?? 0;
  const rowSize = width * bytesPerPixel + rowPadding;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");

  const imageData = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = y * rowSize + x * bytesPerPixel;
      const gray = pixels[src] ?? 0;
      const dst = (y * width + x) * 4;
      imageData.data[dst] = gray;
      imageData.data[dst + 1] = gray;
      imageData.data[dst + 2] = gray;
      imageData.data[dst + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return {
    imageB64: canvas.toDataURL("image/png").split(",")[1] || "",
    dpi: fmt?.iXdpi ?? fmt?.iYdpi ?? 500,
  };
};

const qualityHint = (code: Fingerprint.QualityCode): string | null => {
  switch (code) {
    case Fingerprint.QualityCode.Good:
      return null;
    case Fingerprint.QualityCode.TooLight:
    case Fingerprint.QualityCode.PressureTooLight:
      return "Press a little harder and hold still.";
    case Fingerprint.QualityCode.TooDark:
    case Fingerprint.QualityCode.PressureTooHard:
      return "Press a little lighter.";
    case Fingerprint.QualityCode.NotCentered:
      return "Center your finger on the reader.";
    default:
      return "Hold your finger still on the reader.";
  }
};

const parseSamplesJson = (samplesField: string): unknown[] => {
  if (!samplesField) return [];
  try {
    const parsed = JSON.parse(samplesField);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [samplesField];
  }
};

const extractFromEvent = (event: Fingerprint.SamplesAcquired): CaptureResult => {
  const items = parseSamplesJson(event.samples);
  if (!items.length) {
    throw new FingerprintReaderError("Empty fingerprint sample.", "CAPTURE_FAILED");
  }

  const fmt = event.sampleFormat;
  const first = items[0];

  if (fmt === Fingerprint.SampleFormat.PngImage) {
    const raw = typeof first === "string" ? first : String((first as BioSampleLike).Data || "");
    if (!raw) throw new FingerprintReaderError("Empty PNG sample.", "CAPTURE_FAILED");
    return { imageB64: Fingerprint.b64UrlTo64(raw), dpi: 500, format: "png" };
  }

  if (fmt === Fingerprint.SampleFormat.Raw || fmt === Fingerprint.SampleFormat.Intermediate) {
    if (typeof first === "object" && first && (first as BioSampleLike).Data) {
      const { imageB64, dpi } = rawSampleToPngBase64(first as BioSampleLike);
      return { imageB64, dpi, format: "raw" };
    }
    if (typeof first === "string") {
      const std = Fingerprint.b64UrlTo64(first);
      if (std.startsWith("iVBOR")) {
        return { imageB64: std, dpi: 500, format: "png" };
      }
    }
  }

  throw new FingerprintReaderError("Could not read fingerprint image from reader.", "CAPTURE_FAILED");
};

const classifyCaptureFailure = (trace: CaptureTrace): FingerprintReaderError => {
  if (trace.samplesAcquired) {
    return new FingerprintReaderError("Could not read fingerprint image from reader.", "CAPTURE_FAILED");
  }
  if (trace.qualityReported) {
    return new FingerprintReaderError(
      "Finger detected but no image received. Install the DigitalPersona non-WBF driver (not Windows Hello), reboot, and try again.",
      "WBF_DRIVER"
    );
  }
  if (trace.acquisitionStarted) {
    return new FingerprintReaderError(
      "Reader started but did not detect your finger. Place your finger on the scanner and hold still for 3 seconds.",
      "TIMEOUT"
    );
  }
  return new FingerprintReaderError(
    "Reader detected but sent no finger data. This usually means the Windows Hello (WBF) driver is installed instead of the DigitalPersona non-WBF driver. Install the correct driver, reboot, and try again.",
    "WBF_DRIVER"
  );
};

export const getReaderInfo = async (): Promise<ReaderInfo | null> => {
  const api = getApi();
  const devices = await listReaders();
  if (!devices.length) return null;
  const deviceId = devices[0];
  try {
    const details = (await api.getDeviceInfo(deviceId)) as Record<string, unknown> | null;
    return { deviceId, details };
  } catch {
    return { deviceId, details: null };
  }
};

/** Console diagnostics — run from DevTools: `window.__novaHrDiagnoseFp?.()` */
export const diagnoseFingerprintReader = async (): Promise<void> => {
  console.info("[fingerprint] diagnose: starting…");
  try {
    const api = getApi();
    const devices = await api.enumerateDevices();
    console.info("[fingerprint] diagnose: devices", devices);
    for (const id of devices) {
      try {
        console.info(`[fingerprint] diagnose: info for ${id}`, await api.getDeviceInfo(id));
      } catch (e) {
        console.warn(`[fingerprint] diagnose: getDeviceInfo failed for ${id}`, e);
      }
    }
    console.info(
      "[fingerprint] diagnose: open this URL in a new tab — should say 'endpoint Web SDK':",
      LITE_CLIENT_TEST_URL
    );
  } catch (e) {
    console.error("[fingerprint] diagnose failed:", e);
  }
};

if (typeof window !== "undefined") {
  (window as Window & { __novaHrDiagnoseFp?: () => Promise<void> }).__novaHrDiagnoseFp =
    diagnoseFingerprintReader;
}

export const listReaders = async (): Promise<string[]> => {
  try {
    const api = getApi();
    const devices = await api.enumerateDevices();
    return Array.isArray(devices) ? devices.filter(Boolean) : [];
  } catch {
    throw new FingerprintReaderError(
      "DigitalPersona client not detected. Install the Lite Client on Windows and reload.",
      "NO_CLIENT"
    );
  }
};

type CaptureOptions = {
  timeoutMs?: number;
  onQuality?: (hint: string | null) => void;
  onStatus?: (message: string) => void;
};

const captureWithFormat = (
  api: Fingerprint.WebApi,
  deviceId: string,
  format: Fingerprint.SampleFormat,
  timeoutMs: number,
  opts: CaptureOptions
): Promise<CaptureResult> =>
  new Promise((resolve, reject) => {
    let settled = false;
    const trace: CaptureTrace = {
      acquisitionStarted: false,
      qualityReported: false,
      samplesAcquired: false,
      errorOccurred: false,
    };
    let timer: number | undefined;

    const cleanup = () => {
      if (timer) window.clearTimeout(timer);
      api.off("SamplesAcquired", onSamples);
      api.off("QualityReported", onQuality);
      api.off("AcquisitionStarted", onStarted);
      api.off("AcquisitionStopped", onStopped);
      api.off("ErrorOccurred", onError);
      api.onSamplesAcquired = undefined;
      api.onQualityReported = undefined;
      api.onAcquisitionStarted = undefined;
      api.onAcquisitionStopped = undefined;
      api.onErrorOccurred = undefined;
      api.onCommunicationFailed = undefined;
    };

    const finishStop = () => {
      cleanup();
      void api.stopAcquisition(deviceId).catch(() => {});
    };

    const fail = (err: FingerprintReaderError) => {
      if (settled) return;
      settled = true;
      console.warn("[fingerprint] capture failed", { format, deviceId, trace, message: err.message });
      finishStop();
      reject(err);
    };

    const succeed = (result: CaptureResult) => {
      if (settled) return;
      settled = true;
      finishStop();
      resolve(result);
    };

    const onSamples = (event: Fingerprint.SamplesAcquired) => {
      trace.samplesAcquired = true;
      try {
        console.info("[fingerprint] SamplesAcquired format=", event.sampleFormat);
        succeed(extractFromEvent(event));
      } catch (e) {
        fail(
          e instanceof FingerprintReaderError
            ? e
            : new FingerprintReaderError(String(e), "CAPTURE_FAILED")
        );
      }
    };

    const onQuality = (event: Fingerprint.QualityReported) => {
      trace.qualityReported = true;
      console.info("[fingerprint] QualityReported quality=", event.quality);
      opts.onQuality?.(qualityHint(event.quality));
    };

    const onStarted = (event: Fingerprint.AcquisitionStarted) => {
      trace.acquisitionStarted = true;
      console.info("[fingerprint] AcquisitionStarted device=", event.deviceUid);
    };

    const onStopped = (event: Fingerprint.AcquisitionStopped) => {
      console.info("[fingerprint] AcquisitionStopped device=", event.deviceUid);
    };

    const onError = (event: Fingerprint.ErrorOccurred) => {
      trace.errorOccurred = true;
      trace.lastError = event.error;
      console.warn("[fingerprint] ErrorOccurred code=", event.error);
    };

    timer = window.setTimeout(() => {
      fail(classifyCaptureFailure(trace));
    }, timeoutMs);

    api.on("SamplesAcquired", onSamples);
    api.onSamplesAcquired = onSamples;
    api.on("QualityReported", onQuality);
    api.onQualityReported = onQuality;
    api.on("AcquisitionStarted", onStarted);
    api.onAcquisitionStarted = onStarted;
    api.on("AcquisitionStopped", onStopped);
    api.onAcquisitionStopped = onStopped;
    api.on("ErrorOccurred", onError);
    api.onErrorOccurred = onError;
    api.onCommunicationFailed = () => {
      fail(
        new FingerprintReaderError(
          "Lost connection to DigitalPersona client. Restart Lite Client and reload.",
          "NO_CLIENT"
        )
      );
    };

    console.info("[fingerprint] startAcquisition format=", format, "device=", deviceId);
    api
      .startAcquisition(format, deviceId)
      .then(() => console.info("[fingerprint] startAcquisition accepted"))
      .catch((err: unknown) => {
        fail(
          new FingerprintReaderError(
            `Could not start reader: ${String((err as Error)?.message || err)}`,
            "CAPTURE_FAILED"
          )
        );
      });
  });

/**
 * Capture one fingerprint image. Tries PNG then Raw on the detected reader,
 * then retries with the default device ID if no SDK events were received.
 */
export const captureFingerprintImage = async (
  opts: CaptureOptions = {}
): Promise<CaptureResult> => {
  if (activeCapture) {
    throw new FingerprintReaderError("Fingerprint capture already in progress.", "BUSY");
  }

  const api = getApi();
  const devices = await listReaders();
  if (!devices.length) {
    throw new FingerprintReaderError(
      "No fingerprint reader detected. Plug in the reader and reload.",
      "NO_READER"
    );
  }

  const deviceIds = [...new Set([devices[0], DEFAULT_DEVICE_ID])];
  const formats = [Fingerprint.SampleFormat.PngImage, Fingerprint.SampleFormat.Raw];
  const totalMs = opts.timeoutMs ?? 40000;
  const perAttemptMs = Math.floor(totalMs / (formats.length * deviceIds.length));

  console.info("[fingerprint] devices:", devices);

  opts.onStatus?.("Place your finger on the reader and hold still…");

  let aborted = false;
  activeCapture = {
    abort: () => {
      aborted = true;
      void api.stopAcquisition(devices[0]).catch(() => {});
      void api.stopAcquisition(DEFAULT_DEVICE_ID).catch(() => {});
    },
  };

  let lastError: FingerprintReaderError | null = null;

  try {
    for (const deviceId of deviceIds) {
      for (let i = 0; i < formats.length; i++) {
        if (aborted) {
          throw new FingerprintReaderError("Capture cancelled.", "CAPTURE_FAILED");
        }
        if (i > 0 || deviceId !== deviceIds[0]) {
          opts.onStatus?.("Retrying capture…");
          await api.stopAcquisition(deviceId).catch(() => {});
          await new Promise((r) => window.setTimeout(r, 400));
        }
        try {
          return await captureWithFormat(api, deviceId, formats[i], perAttemptMs, opts);
        } catch (e) {
          if (aborted) throw e;
          lastError = e instanceof FingerprintReaderError ? e : new FingerprintReaderError(String(e), "CAPTURE_FAILED");
          console.warn("[fingerprint] attempt failed", { deviceId, format: formats[i], error: lastError.message });
        }
      }
    }
    throw lastError ?? new FingerprintReaderError("Fingerprint capture failed.", "CAPTURE_FAILED");
  } finally {
    activeCapture = null;
    await api.stopAcquisition(devices[0]).catch(() => {});
    await api.stopAcquisition(DEFAULT_DEVICE_ID).catch(() => {});
  }
};
