from __future__ import annotations

from flask import request

from mm_db_cloud.models.edit import parse_edit_request
from mm_db_cloud.models.errors import AuthError, RequestValidationError
from mm_db_cloud.services.auth import verify_request
from mm_db_cloud.services.db_ops import run_ops
from mm_db_cloud.utils.http import ok, fail
from mm_db_cloud.utils.jsonutil import get_json_or_raise


def edit_handler():
    try:
        verify_request(request)
        payload = get_json_or_raise(request)
        req = parse_edit_request(payload)
        result = run_ops(req.ops_request)
        return ok({"result": result})
    except AuthError as e:
        return fail(str(e), status=401)
    except (RequestValidationError, ValueError) as e:
        return fail(str(e), status=400)
    except Exception as e:
        return fail("Internal error", status=500, details={"exception": repr(e)})
