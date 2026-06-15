#!/usr/bin/env python3
"""Identify a finger against a gallery of serialized templates (stdin JSON)."""
import base64
import json
import sys
import time

import gi

gi.require_version("FPrint", "2.0")
from gi.repository import FPrint, GLib  # noqa: E402


def open_device_with_retry(ctx, attempts: int = 8, delay: float = 0.6):
    """Open the first scanner, retrying while a prior process releases the USB handle."""
    last_error = None
    for _ in range(attempts):
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
        except GLib.Error as exc:
            last_error = str(exc)
            time.sleep(delay)
            ctx = FPrint.Context()
    raise RuntimeError(last_error or "device_open_failed")


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        print(json.dumps({"success": False, "error": "invalid_json"}))
        sys.exit(1)

    templates = payload.get("templates") or []
    if not templates:
        print(json.dumps({"success": False, "error": "no_templates"}))
        sys.exit(1)

    ctx = FPrint.Context()

    gallery = []
    id_by_print = {}
    for item in templates:
        try:
            raw = base64.b64decode(item["template_b64"])
            fp_print = FPrint.Print.deserialize(raw)
            gallery.append(fp_print)
            id_by_print[id(fp_print)] = item["id"]
        except Exception:  # pylint: disable=broad-except
            continue

    if not gallery:
        print(json.dumps({"success": False, "error": "no_valid_templates"}))
        sys.exit(1)

    try:
        dev = open_device_with_retry(ctx)
    except Exception as exc:  # pylint: disable=broad-except
        print(json.dumps({"success": False, "error": f"scanner_unavailable: {exc}"}))
        sys.exit(1)

    try:
        # libfprint 2.x: identify_sync(prints, cancellable, match_cb, match_data)
        # returns (match, print): `match` is the gallery print that matched
        # (or None if no match), `print` is the freshly scanned print.
        result = dev.identify_sync(gallery, None, None, None)
        matched_print = result[0] if isinstance(result, (tuple, list)) else result

        if matched_print is None:
            print(json.dumps({"success": False, "error": "no_match"}))
            sys.exit(0)

        template_id = id_by_print.get(id(matched_print))
        if not template_id:
            # Fall back to matching by serialized bytes if identity mapping fails.
            try:
                matched_raw = bytes(matched_print.serialize())
                for item in templates:
                    if base64.b64decode(item["template_b64"]) == matched_raw:
                        template_id = item["id"]
                        break
            except Exception:  # pylint: disable=broad-except
                template_id = None

        if not template_id:
            print(json.dumps({"success": False, "error": "match_not_mapped"}))
            sys.exit(1)

        print(
            json.dumps(
                {
                    "success": True,
                    "template_id": template_id,
                    "match_score": None,
                    "device_name": dev.get_name(),
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
