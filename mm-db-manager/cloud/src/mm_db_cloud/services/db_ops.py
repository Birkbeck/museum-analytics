from __future__ import annotations

from typing import Any, Dict

from mm_db_cloud.models.common import OpsRequest
from mm_db_cloud.services.sheets_service import SheetsService


def run_ops(ops_request: OpsRequest) -> Dict[str, Any]:
    sheets = SheetsService()
    return sheets.apply_ops(ops_request.spreadsheetId, ops_request.ops)
