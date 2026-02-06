from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

import google.auth
from google.auth.credentials import with_scopes_if_required
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from mm_db_cloud.models.common import (
    AppendOp,
    ClearOp,
    CopyPasteOp,
    DeleteRowsOp,
    SheetOp,
    UpdateOp,
)

SHEETS_SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


class SheetsService:
    def __init__(self) -> None:
        creds, _ = google.auth.default()
        creds = with_scopes_if_required(creds, scopes=SHEETS_SCOPES)
        self._service = build("sheets", "v4", credentials=creds, cache_discovery=False)

    def append_row(
        self, spreadsheet_id: str, sheet_name: str, row_values: List[Any]
    ) -> Dict[str, Any]:
        return (
            self._service.spreadsheets()
            .values()
            .append(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A:A",
                valueInputOption="RAW",
                insertDataOption="INSERT_ROWS",
                body={"values": [row_values]},
            )
            .execute()
        )

    def batch_update_values(
        self, spreadsheet_id: str, updates: List[Tuple[str, List[List[Any]]]]
    ) -> Dict[str, Any]:
        data = [{"range": r, "values": v} for (r, v) in updates]
        return (
            self._service.spreadsheets()
            .values()
            .batchUpdate(
                spreadsheetId=spreadsheet_id,
                body={
                    "valueInputOption": "RAW",
                    "data": data,
                },
            )
            .execute()
        )

    def clear_range(self, spreadsheet_id: str, range_a1: str) -> Dict[str, Any]:
        return (
            self._service.spreadsheets()
            .values()
            .clear(spreadsheetId=spreadsheet_id, range=range_a1, body={})
            .execute()
        )

    def batch_update_structural(
        self, spreadsheet_id: str, requests: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        return (
            self._service.spreadsheets()
            .batchUpdate(spreadsheetId=spreadsheet_id, body={"requests": requests})
            .execute()
        )

    def apply_ops(self, spreadsheet_id: str, ops: List[SheetOp]) -> Dict[str, Any]:
        """
        Applies ops in a sane grouping:
          1) values batch updates (update)
          2) clears (clear)
          3) structural requests (deleteRows/copyPaste) via batchUpdate
          4) appends (append) last
        """
        value_updates: List[Tuple[str, List[List[Any]]]] = []
        clears: List[str] = []
        structural_requests: List[Dict[str, Any]] = []
        appends: List[AppendOp] = []

        for op in ops:
            if isinstance(op, UpdateOp):
                value_updates.append((op.rangeA1, op.values))
            elif isinstance(op, ClearOp):
                clears.append(op.rangeA1)
            elif isinstance(op, DeleteRowsOp):
                structural_requests.append(
                    {
                        "deleteDimension": {
                            "range": {
                                "sheetId": op.sheetId,
                                "dimension": "ROWS",
                                "startIndex": op.startIndex,
                                "endIndex": op.endIndex,
                            }
                        }
                    }
                )
            elif isinstance(op, CopyPasteOp):
                structural_requests.append(
                    {
                        "copyPaste": {
                            "source": op.source,
                            "destination": op.destination,
                            "pasteType": op.pasteType,
                        }
                    }
                )
            elif isinstance(op, AppendOp):
                appends.append(op)
            else:
                raise ValueError(f"Unhandled op type: {op}")

        result: Dict[str, Any] = {
            "valueUpdates": None,
            "clears": [],
            "structural": None,
            "appends": [],
        }

        if value_updates:
            result["valueUpdates"] = self.batch_update_values(
                spreadsheet_id, value_updates
            )

        for r in clears:
            result["clears"].append(self.clear_range(spreadsheet_id, r))

        if structural_requests:
            result["structural"] = self.batch_update_structural(
                spreadsheet_id, structural_requests
            )

        for a in appends:
            result["appends"].append(
                self.append_row(spreadsheet_id, a.sheetName, a.rowValues)
            )

        return result

    def get_values(self, spreadsheet_id: str, range_a1: str) -> List[List[Any]]:
        resp = (
            self._service.spreadsheets()
            .values()
            .get(spreadsheetId=spreadsheet_id, range=range_a1)
            .execute()
        )
        return resp.get("values", [])

    def get_sheet_id_by_name(self, spreadsheet_id: str, sheet_name: str) -> int:
        meta = self._service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        for s in meta.get("sheets", []):
            props = s.get("properties", {})
            if props.get("title") == sheet_name:
                sid = props.get("sheetId")
                if isinstance(sid, int):
                    return sid
        raise ValueError(f"Sheet not found: {sheet_name}")

    def delete_rows(
        self, spreadsheet_id: str, sheet_id: int, start_index: int, end_index: int
    ) -> Dict[str, Any]:
        """
        start_index/end_index are 0-based, end exclusive (Sheets API semantics).
        """
        req = {
            "deleteDimension": {
                "range": {
                    "sheetId": sheet_id,
                    "dimension": "ROWS",
                    "startIndex": start_index,
                    "endIndex": end_index,
                }
            }
        }
        return self.batch_update_structural(spreadsheet_id, [req])

    def create_sheet(self, spreadsheet_id: str, title: str) -> Dict[str, Any]:
        req = {"addSheet": {"properties": {"title": title}}}
        return self.batch_update_structural(spreadsheet_id, [req])

    def hide_sheet(self, spreadsheet_id: str, sheet_id: int) -> Dict[str, Any]:
        req = {
            "updateSheetProperties": {
                "properties": {"sheetId": sheet_id, "hidden": True},
                "fields": "hidden",
            }
        }
        return self.batch_update_structural(spreadsheet_id, [req])

    def get_single_value(self, spreadsheet_id: str, range_a1: str) -> Any:
        vals = self.get_values(spreadsheet_id, range_a1)
        if not vals or not vals[0]:
            return ""
        return vals[0][0]
