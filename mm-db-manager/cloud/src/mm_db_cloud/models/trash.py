from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict

from mm_db_cloud.models.common import OpsRequest, parse_ops_request


@dataclass(frozen=True)
class TrashRequest:
    ops_request: OpsRequest


def parse_trash_request(payload: Dict[str, Any]) -> TrashRequest:
    return TrashRequest(ops_request=parse_ops_request(payload))
