#!/usr/bin/env python3
"""Report whether a fingerprint scanner is available (no capture)."""
import json
import sys

import gi

gi.require_version("FPrint", "2.0")
from gi.repository import FPrint  # noqa: E402


def main() -> None:
    try:
        ctx = FPrint.Context()
        devices = ctx.get_devices()
        if not devices:
            print(json.dumps({"available": False, "error": "no_scanner"}))
            sys.exit(0)
        dev = devices[0]
        print(
            json.dumps(
                {
                    "available": True,
                    "device_name": dev.get_name(),
                    "device_id": dev.get_device_id(),
                }
            )
        )
    except Exception as exc:  # pylint: disable=broad-except
        print(json.dumps({"available": False, "error": str(exc)}))


if __name__ == "__main__":
    main()
