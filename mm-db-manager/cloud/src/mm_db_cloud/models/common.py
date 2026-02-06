from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional, Union

from mm_db_cloud.models.errors import RequestValidationError


@dataclass(frozen=True)
class AppendOp:
    type: Literal["append"]
    sheetName: str
    rowValues: List[Any]


@dataclass(frozen=True)
class UpdateOp:
    type: Literal["update"]
    rangeA1: str
    values: List[List[Any]]  # 2D


@dataclass(frozen=True)
class ClearOp:
    type: Literal["clear"]
    rangeA1: str


@dataclass(frozen=True)
class DeleteRowsOp:
    """
    Structural delete via spreadsheets.batchUpdate (DeleteDimensionRequest)
    Indices are 0-based, endIndex is exclusive.
    """

    type: Literal["deleteRows"]
    sheetId: int
    startIndex: int
    endIndex: int


@dataclass(frozen=True)
class CopyPasteOp:
    """
    Optional: for moving blocks around in a sheet using copyPaste in batchUpdate.
    You may not need this if TS sends explicit values to write instead.
    """

    type: Literal["copyPaste"]
    source: Dict[
        str, int
    ]  # {sheetId,startRowIndex,endRowIndex,startColumnIndex,endColumnIndex}
    destination: Dict[str, int]  # same shape
    pasteType: str  # e.g. "PASTE_VALUES"


SheetOp = Union[AppendOp, UpdateOp, ClearOp, DeleteRowsOp, CopyPasteOp]


def parse_sheet_op(obj: Dict[str, Any]) -> SheetOp:
    t = obj.get("type")
    if t == "append":
        sheet_name = obj.get("sheetName")
        row_values = obj.get("rowValues")
        if not isinstance(sheet_name, str) or not sheet_name:
            raise RequestValidationError("append.sheetName must be a non-empty string")
        if not isinstance(row_values, list):
            raise RequestValidationError("append.rowValues must be a list")
        return AppendOp(type="append", sheetName=sheet_name, rowValues=row_values)

    if t == "update":
        range_a1 = obj.get("rangeA1")
        values = obj.get("values")
        if not isinstance(range_a1, str) or "!" not in range_a1:
            raise RequestValidationError(
                "update.rangeA1 must be A1 notation including sheet (e.g. 'DB!A2:Z2')"
            )
        if not (isinstance(values, list) and all(isinstance(r, list) for r in values)):
            raise RequestValidationError("update.values must be a 2D array")
        return UpdateOp(type="update", rangeA1=range_a1, values=values)

    if t == "clear":
        range_a1 = obj.get("rangeA1")
        if not isinstance(range_a1, str) or "!" not in range_a1:
            raise RequestValidationError(
                "clear.rangeA1 must be A1 notation including sheet"
            )
        return ClearOp(type="clear", rangeA1=range_a1)

    if t == "deleteRows":
        sheet_id = obj.get("sheetId")
        start = obj.get("startIndex")
        end = obj.get("endIndex")
        if not all(isinstance(x, int) for x in [sheet_id, start, end]):
            raise RequestValidationError(
                "deleteRows requires integer sheetId/startIndex/endIndex"
            )
        if start < 0 or end < 0 or end <= start:
            raise RequestValidationError(
                "deleteRows indices invalid (need 0 <= start < end)"
            )
        return DeleteRowsOp(
            type="deleteRows", sheetId=sheet_id, startIndex=start, endIndex=end
        )

    if t == "copyPaste":
        source = obj.get("source")
        dest = obj.get("destination")
        paste_type = obj.get("pasteType", "PASTE_VALUES")
        if not (isinstance(source, dict) and isinstance(dest, dict)):
            raise RequestValidationError(
                "copyPaste requires source and destination objects"
            )
        return CopyPasteOp(
            type="copyPaste", source=source, destination=dest, pasteType=str(paste_type)
        )

    raise RequestValidationError(f"Unknown op type: {t!r}")


@dataclass(frozen=True)
class OpsRequest:
    spreadsheetId: str
    ops: List[SheetOp]


def parse_ops_request(payload: Dict[str, Any]) -> OpsRequest:
    spreadsheet_id = payload.get("spreadsheetId")
    ops = payload.get("ops")
    if not isinstance(spreadsheet_id, str) or not spreadsheet_id:
        raise RequestValidationError("spreadsheetId must be a non-empty string")
    if not (isinstance(ops, list) and all(isinstance(o, dict) for o in ops)):
        raise RequestValidationError("ops must be a list of objects")
    parsed_ops = [parse_sheet_op(o) for o in ops]
    return OpsRequest(spreadsheetId=spreadsheet_id, ops=parsed_ops)
