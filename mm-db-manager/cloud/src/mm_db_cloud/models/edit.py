from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict

from mm_db_cloud.models.common import OpsRequest, parse_ops_request


@dataclass(frozen=True)
class EditRequest:
    ops_request: OpsRequest


def parse_edit_request(payload: Dict[str, Any]) -> EditRequest:
    return EditRequest(ops_request=parse_ops_request(payload))
