from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict

from mm_db_cloud.models.common import OpsRequest, parse_ops_request


@dataclass(frozen=True)
class AddRequest:
    ops_request: OpsRequest


def parse_add_request(payload: Dict[str, Any]) -> AddRequest:
    return AddRequest(ops_request=parse_ops_request(payload))
