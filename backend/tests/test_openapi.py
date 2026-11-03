import json
from pathlib import Path

from relay.openapi import main


def test_dump_needs_no_database(tmp_path: Path) -> None:
    out = tmp_path / "openapi.json"

    assert main(["relay.openapi", str(out)]) == 0

    text = out.read_text(encoding="utf-8")
    spec = json.loads(text)
    assert spec["info"]["title"] == "EHDS Relay API"
    assert "/healthz" in spec["paths"]
    # Sorted keys and a trailing newline keep the committed spec diff-stable.
    assert text == json.dumps(spec, indent=2, sort_keys=True) + "\n"


def test_dump_is_repeatable(tmp_path: Path) -> None:
    first, second = tmp_path / "a.json", tmp_path / "b.json"

    main(["relay.openapi", str(first)])
    main(["relay.openapi", str(second)])

    assert first.read_bytes() == second.read_bytes()


def test_usage_error_without_output_path() -> None:
    assert main(["relay.openapi"]) == 2
