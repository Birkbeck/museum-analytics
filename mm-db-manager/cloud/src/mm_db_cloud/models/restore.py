from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict

from mm_db_cloud.models.common import OpsRequest, parse_ops_request


@dataclass(frozen=True)
class RestoreRequest:
    ops_request: OpsRequest


def parse_restore_request(payload: Dict[str, Any]) -> RestoreRequest:
    return RestoreRequest(ops_request=parse_ops_request(payload))
