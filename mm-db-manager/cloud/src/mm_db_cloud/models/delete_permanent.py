from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict

from mm_db_cloud.models.common import OpsRequest, parse_ops_request


@dataclass(frozen=True)
class DeletePermanentRequest:
    ops_request: OpsRequest


def parse_delete_permanent_request(payload: Dict[str, Any]) -> DeletePermanentRequest:
    return DeletePermanentRequest(ops_request=parse_ops_request(payload))
