"""Dump the OpenAPI spec without a server or a database.

Usage: python -m relay.openapi <output-file>

`create_app()` does not connect to the database (the engine is created lazily), so the
spec can be generated in CI or on a laptop with nothing running. Keys are sorted and the
output ends with a newline so that regenerating an unchanged API gives a byte-identical file.
"""

import json
import sys
from pathlib import Path

from relay.app import create_app


def render() -> str:
    return json.dumps(create_app().openapi(), indent=2, sort_keys=True) + "\n"


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: python -m relay.openapi <output-file>", file=sys.stderr)
        return 2
    # Write to a file rather than stdout so log output can never end up in the spec.
    Path(argv[1]).write_text(render(), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
