import base64
import hashlib
import hmac
import json
import os
import time
import uuid
import urllib.request
import urllib.error
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import pytest
import google.auth
from googleapiclient.discovery import build


# ----------------------------
# Config + skipping
# ----------------------------

REQUIRED_ENV = [
    "MM_DB_CLOUD_BASE_URL",
    "MM_DB_CLOUD_HMAC_SECRET",
    "MM_DB_TEST_SPREADSHEET_ID",
    "MM_DB_TEST_DB_SHEET_NAME",
    "MM_DB_TEST_TRASH_SHEET_NAME",
    "MM_DB_TEST_DB_SHEET_ID",
    "MM_DB_TEST_TRASH_SHEET_ID",
]

SHEETS_SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]


def _missing_env() -> List[str]:
    return [k for k in REQUIRED_ENV if not os.environ.get(k)]


pytestmark = pytest.mark.skipif(
    bool(_missing_env()),
    reason="Missing env vars: " + ", ".join(_missing_env()),
)


# ----------------------------
# Helpers: HTTP (HMAC signed)
# ----------------------------


def _sign_hmac_b64(secret: str, raw_body: bytes) -> str:
    mac = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).digest()
    return base64.b64encode(mac).decode("utf-8")


def post_json_signed(
    url: str, payload: Dict[str, Any], hmac_secret: str, timeout_s: int = 30
) -> Dict[str, Any]:
    raw = json.dumps(payload).encode("utf-8")
    sig = _sign_hmac_b64(hmac_secret, raw)

    req = urllib.request.Request(
        url=url,
        data=raw,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Signature": sig,
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            body = resp.read().decode("utf-8")
            data = json.loads(body)

            # Accept either schema:
            # - our ops service: {"ok": true, ...}
            # - other services: {"status": "ok", ...}
            if data.get("ok") is True:
                return data
            if data.get("status") == "ok":
                # Normalize to look like our shape
                return {"ok": True, "result": data}

            # If neither, raise with full payload for debugging
            raise RuntimeError(f"Unexpected response schema: {data}")

    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code} from {url}: {body}") from e


# ----------------------------
# Helpers: Sheets API reads (verification)
# ----------------------------


@dataclass(frozen=True)
class Config:
    base_url: str
    hmac_secret: str
    spreadsheet_id: str
    db_sheet_name: str
    trash_sheet_name: str
    db_sheet_id: int
    trash_sheet_id: int


def _cfg() -> Config:
    return Config(
        base_url=os.environ["MM_DB_CLOUD_BASE_URL"].rstrip("/"),
        hmac_secret=os.environ["MM_DB_CLOUD_HMAC_SECRET"],
        spreadsheet_id=os.environ["MM_DB_TEST_SPREADSHEET_ID"],
        db_sheet_name=os.environ["MM_DB_TEST_DB_SHEET_NAME"],
        trash_sheet_name=os.environ["MM_DB_TEST_TRASH_SHEET_NAME"],
        db_sheet_id=int(os.environ["MM_DB_TEST_DB_SHEET_ID"]),
        trash_sheet_id=int(os.environ["MM_DB_TEST_TRASH_SHEET_ID"]),
    )


def make_sheets_readonly_client():
    creds, _ = google.auth.default(scopes=SHEETS_SCOPES)
    return build("sheets", "v4", credentials=creds, cache_discovery=False)


def read_range(service, spreadsheet_id: str, range_a1: str) -> List[List[Any]]:
    resp = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=spreadsheet_id, range=range_a1)
        .execute()
    )
    return resp.get("values", [])


def find_row_by_marker(
    service, cfg: Config, sheet_name: str, marker: str, search_cols: str = "A:Z"
) -> Optional[int]:
    """
    Returns 1-based row number where marker appears anywhere in the row, else None.
    Searches in a wide A:Z range by default.
    """
    values = read_range(service, cfg.spreadsheet_id, f"{sheet_name}!{search_cols}")
    for i, row in enumerate(values, start=1):
        if any(cell == marker for cell in row):
            return i
    return None


def wait_for_row_presence(
    service,
    cfg: Config,
    sheet_name: str,
    marker: str,
    want_present: bool,
    timeout_s: int = 30,
) -> Optional[int]:
    """
    Polls until marker is present/absent. Returns row number if present, or None if absent.
    """
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        row = find_row_by_marker(service, cfg, sheet_name, marker)
        if want_present and row is not None:
            return row
        if not want_present and row is None:
            return None
        time.sleep(0.75)
    # final check
    row = find_row_by_marker(service, cfg, sheet_name, marker)
    if want_present:
        raise AssertionError(
            f"Timed out waiting for marker {marker} to appear in {sheet_name}"
        )
    else:
        raise AssertionError(
            f"Timed out waiting for marker {marker} to disappear from {sheet_name}"
        )


def parse_row_from_updated_range(updated_range: str) -> int:
    """
    updatedRange often looks like 'Database!A42' or 'Database!A42:Z42'
    Return the row number (42).
    """
    # split at '!' then take the first cell ref like 'A42' or 'A42:Z42'
    try:
        a1 = updated_range.split("!", 1)[1]
    except Exception:
        raise ValueError(f"Unexpected updatedRange: {updated_range!r}")

    first = a1.split(":", 1)[0]  # e.g. A42
    # extract digits at end
    digits = "".join(ch for ch in first if ch.isdigit())
    if not digits:
        raise ValueError(
            f"Could not parse row number from updatedRange: {updated_range!r}"
        )
    return int(digits)


# ----------------------------
# Build ops for lifecycle steps
# ----------------------------


def op_append(sheet_name: str, row_values: List[Any]) -> Dict[str, Any]:
    return {"type": "append", "sheetName": sheet_name, "rowValues": row_values}


def op_update(range_a1: str, values_2d: List[List[Any]]) -> Dict[str, Any]:
    return {"type": "update", "rangeA1": range_a1, "values": values_2d}


def op_delete_row(sheet_id: int, row_number_1_based: int) -> Dict[str, Any]:
    # deleteRows uses 0-based indices, end exclusive
    start = row_number_1_based - 1
    end = row_number_1_based
    return {
        "type": "deleteRows",
        "sheetId": sheet_id,
        "startIndex": start,
        "endIndex": end,
    }


# ----------------------------
# The integration test
# ----------------------------


@pytest.mark.integration
def test_full_row_lifecycle_real_sheet():
    cfg = _cfg()
    sheets = make_sheets_readonly_client()

    marker_v1 = f"ITEST-{uuid.uuid4()}"
    marker_v2 = marker_v1 + "-EDITED"

    # keep row short; Sheets API will just place these in A,B,C...
    initial_row = [marker_v1, "initial", "from integration test"]
    edited_row = [marker_v2, "edited", "from integration test"]

    # ---- 1) ADD (append to DB) ----
    add_payload = {
        "spreadsheetId": cfg.spreadsheet_id,
        "ops": [op_append(cfg.db_sheet_name, initial_row)],
    }
    add_resp = post_json_signed(f"{cfg.base_url}/add", add_payload, cfg.hmac_secret)
    # Try to parse appended row index from response; fall back to searching by marker.
    appended_row_number: Optional[int] = None
    try:
        appends = add_resp["result"]["appends"]
        if (
            appends
            and "updates" in appends[0]
            and "updatedRange" in appends[0]["updates"]
        ):
            appended_row_number = parse_row_from_updated_range(
                appends[0]["updates"]["updatedRange"]
            )
    except Exception:
        appended_row_number = None

    # Verify present in DB
    db_row = wait_for_row_presence(
        sheets, cfg, cfg.db_sheet_name, marker_v1, want_present=True
    )
    assert db_row is not None
    # If we parsed a row number, it should match what we found by search
    if appended_row_number is not None:
        assert appended_row_number == db_row

    # ---- 2) EDIT (update that DB row) ----
    # Update A:C on the exact row we found
    edit_range = f"{cfg.db_sheet_name}!A{db_row}:C{db_row}"
    edit_payload = {
        "spreadsheetId": cfg.spreadsheet_id,
        "ops": [op_update(edit_range, [edited_row])],
    }
    post_json_signed(f"{cfg.base_url}/edit", edit_payload, cfg.hmac_secret)

    # Verify marker changed in DB
    wait_for_row_presence(sheets, cfg, cfg.db_sheet_name, marker_v1, want_present=False)
    db_row_after_edit = wait_for_row_presence(
        sheets, cfg, cfg.db_sheet_name, marker_v2, want_present=True
    )
    assert db_row_after_edit == db_row  # same row, updated values

    # ---- 3) TRASH (append to Trash, delete from DB) ----
    trash_payload = {
        "spreadsheetId": cfg.spreadsheet_id,
        "ops": [
            op_append(cfg.trash_sheet_name, edited_row),
            op_delete_row(cfg.db_sheet_id, db_row),
        ],
    }
    post_json_signed(f"{cfg.base_url}/trash", trash_payload, cfg.hmac_secret)

    # Verify moved: absent in DB, present in Trash
    wait_for_row_presence(sheets, cfg, cfg.db_sheet_name, marker_v2, want_present=False)
    trash_row_1 = wait_for_row_presence(
        sheets, cfg, cfg.trash_sheet_name, marker_v2, want_present=True
    )
    assert trash_row_1 is not None

    # ---- 4) RESTORE (append back to DB, delete from Trash) ----
    restore_payload = {
        "spreadsheetId": cfg.spreadsheet_id,
        "ops": [
            op_append(cfg.db_sheet_name, edited_row),
            op_delete_row(cfg.trash_sheet_id, trash_row_1),
        ],
    }
    post_json_signed(f"{cfg.base_url}/restore", restore_payload, cfg.hmac_secret)

    wait_for_row_presence(
        sheets, cfg, cfg.trash_sheet_name, marker_v2, want_present=False
    )
    db_row_restored = wait_for_row_presence(
        sheets, cfg, cfg.db_sheet_name, marker_v2, want_present=True
    )
    assert db_row_restored is not None

    # ---- 5) TRASH again ----
    trash_payload2 = {
        "spreadsheetId": cfg.spreadsheet_id,
        "ops": [
            op_append(cfg.trash_sheet_name, edited_row),
            op_delete_row(cfg.db_sheet_id, db_row_restored),
        ],
    }
    post_json_signed(f"{cfg.base_url}/trash", trash_payload2, cfg.hmac_secret)

    wait_for_row_presence(sheets, cfg, cfg.db_sheet_name, marker_v2, want_present=False)
    trash_row_2 = wait_for_row_presence(
        sheets, cfg, cfg.trash_sheet_name, marker_v2, want_present=True
    )
    assert trash_row_2 is not None

    # ---- 6) PERMANENT DELETE (delete from Trash) ----
    delete_payload = {
        "spreadsheetId": cfg.spreadsheet_id,
        "ops": [op_delete_row(cfg.trash_sheet_id, trash_row_2)],
    }
    post_json_signed(
        f"{cfg.base_url}/delete_permanent", delete_payload, cfg.hmac_secret
    )

    wait_for_row_presence(
        sheets, cfg, cfg.trash_sheet_name, marker_v2, want_present=False
    )
