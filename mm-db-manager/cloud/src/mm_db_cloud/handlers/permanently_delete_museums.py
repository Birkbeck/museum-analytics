from __future__ import annotations

from flask import Blueprint, jsonify, request

from mm_db_cloud.handlers._pinned_sheet import get_pinned_spreadsheet_id
from mm_db_cloud.models.permanently_delete_museums import (
    PermanentlyDeleteMuseumsRequest,
)
from mm_db_cloud.services.permanently_delete_museums_service import (
    PermanentlyDeleteMuseumsService,
)
from mm_db_cloud.services.auth import verify_request
from mm_db_cloud.services.sheets_service import SheetsService

bp = Blueprint("permanently_delete_museums_domain", __name__)


@bp.post("/permanentlyDeleteMuseums")
def permanently_delete_museums():
    auth_resp = verify_request(request)
    if auth_resp is not None:
        return auth_resp

    spreadsheet_id = get_pinned_spreadsheet_id()

    sheets = SheetsService()
    svc = PermanentlyDeleteMuseumsService(sheets)

    try:
        resp = svc.run(PermanentlyDeleteMuseumsRequest(), spreadsheet_id=spreadsheet_id)
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
