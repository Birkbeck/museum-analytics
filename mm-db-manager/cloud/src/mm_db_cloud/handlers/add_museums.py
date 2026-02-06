from __future__ import annotations

import os
from flask import Blueprint, jsonify, request

from mm_db_cloud.models.add_museums import AddMuseumsRequest
from mm_db_cloud.services.add_museums_service import AddMuseumsService
from mm_db_cloud.services.sheets_service import SheetsService
from mm_db_cloud.services.auth import verify_request


bp = Blueprint("add_museums_domain", __name__)


def _get_spreadsheet_id(req_spreadsheet_id: str | None) -> str:
    pinned = os.environ.get("MM_DB_SPREADSHEET_ID")
    if pinned:
        # If pinned, require match (or require request omits it)
        if req_spreadsheet_id and req_spreadsheet_id != pinned:
            raise ValueError("spreadsheetId does not match server configuration.")
        return pinned

    if not req_spreadsheet_id:
        raise ValueError("Missing spreadsheetId (and MM_DB_SPREADSHEET_ID not set).")
    return req_spreadsheet_id


@bp.post("/addMuseums")
def add_museums():
    # Auth
    auth_resp = verify_hmac_or_unauthorized(request)
    if auth_resp is not None:
        return auth_resp  # typically (json, status)

    data = request.get_json(silent=True) or {}
    req_model = AddMuseumsRequest(
        spreadsheetId=data.get("spreadsheetId"),
        dryRun=bool(data.get("dryRun", False)),
    )
    spreadsheet_id = _get_spreadsheet_id(req_model.spreadsheetId)

    sheets = SheetsService()
    svc = AddMuseumsService(sheets)

    try:
        resp = svc.run(req_model, spreadsheet_id=spreadsheet_id)
        return jsonify(resp.to_dict()), 200
    except Exception as e:
        return (
            jsonify(
                {
                    "ok": False,
                    "error": "Internal error",
                    "details": {"exception": str(e)},
                }
            ),
            500,
        )
