#!/usr/bin/env python3
"""Capture a fingerprint template from the attached scanner (libfprint-2)."""
import base64
import json
import sys
import time

import gi

gi.require_version("FPrint", "2.0")
from gi.repository import FPrint, GLib  # noqa: E402

FINGER_MAP = {
    "right-index-finger": FPrint.Finger.RIGHT_INDEX,
    "left-index-finger": FPrint.Finger.LEFT_INDEX,
    "right-thumb": FPrint.Finger.RIGHT_THUMB,
    "left-thumb": FPrint.Finger.LEFT_THUMB,
}


def open_device_with_retry(ctx, attempts: int = 8, delay: float = 0.6):
    """Open the first scanner, retrying while a prior process releases the USB handle."""
    last_error = None
    for i in range(attempts):
        devices = ctx.get_devices()
        if not devices:
            last_error = "no_scanner"
            time.sleep(delay)
            ctx = FPrint.Context()
            continue
        dev = devices[0]
        try:
            dev.open_sync()
            return dev
        except GLib.Error as exc:  # device busy / still claimed by previous process
            last_error = str(exc)
            time.sleep(delay)
            ctx = FPrint.Context()
    raise RuntimeError(last_error or "device_open_failed")


def main() -> None:
    finger = sys.argv[1] if len(sys.argv) > 1 else "right-index-finger"
    fp_finger = FINGER_MAP.get(finger, FPrint.Finger.RIGHT_INDEX)

    ctx = FPrint.Context()
    try:
        dev = open_device_with_retry(ctx)
    except Exception as exc:  # pylint: disable=broad-except
        print(json.dumps({"success": False, "error": f"scanner_unavailable: {exc}"}))
        sys.exit(1)

    try:
        # libfprint 2.x: enroll_sync(device, template_print, cancellable, progress_cb, progress_data)
        template = FPrint.Print.new(dev)
        template.set_finger(fp_finger)

        def _progress(_device, completed_stages, _print, _error, _user_data):
            # Report each successful finger press to stderr (stdout stays clean JSON).
            sys.stderr.write(f"PROGRESS {completed_stages}\n")
            sys.stderr.flush()

        enrolled = dev.enroll_sync(template, None, _progress, None)
        if enrolled is None:
            print(json.dumps({"success": False, "error": "enroll_returned_null"}))
            sys.exit(1)

        raw = enrolled.serialize()
        print(
            json.dumps(
                {
                    "success": True,
                    "finger": finger,
                    "device_name": dev.get_name(),
                    "template_b64": base64.b64encode(raw).decode("ascii"),
                }
            )
        )
    except Exception as exc:  # pylint: disable=broad-except
        print(json.dumps({"success": False, "error": str(exc)}))
        sys.exit(1)
    finally:
        dev.close_sync()


if __name__ == "__main__":
    main()
