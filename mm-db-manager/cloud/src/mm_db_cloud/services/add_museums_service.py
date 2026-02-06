from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, List, Tuple

from mm_db_cloud.models.add_museums import (
    AddMuseumsRequest,
    AddMuseumsResponse,
    RowError,
)
from mm_db_cloud.services.id_allocator import IdAllocator
from mm_db_cloud.utils.row_mapper import map_add_row_to_db_row
from mm_db_cloud.utils.validators import validate_form_row
from mm_db_cloud.config.sheet_config import (
    ADD_LAST_COL_INDEX,
    ADD_READY_TO_COMMIT,
    ADD_SHEET_NAME,
    DB_SHEET_NAME,
    INSTRUCTIONS_DATE_A1,
    INSTRUCTIONS_SHEET_NAME,
)


def _is_ready_cell(v: Any) -> bool:
    if v is True:
        return True
    if isinstance(v, str) and v.strip().lower() == "true":
        return True
    return False


def _pad_row(row: List[Any], total_cols: int) -> List[Any]:
    if len(row) >= total_cols:
        return row[:total_cols]
    return row + [""] * (total_cols - len(row))


class AddMuseumsService:
    def __init__(self, sheets_service) -> None:
        self.sheets = sheets_service
        self.id_allocator = IdAllocator(sheets_service)

    def run(self, req: AddMuseumsRequest, spreadsheet_id: str) -> AddMuseumsResponse:
        add_values = self.sheets.get_values(
            spreadsheet_id,
            f"{ADD_SHEET_NAME}!A2:Z",
        )

        if not add_values:
            return AddMuseumsResponse(
                ok=True,
                addedCount=0,
                errorsByRow=[],
                skippedNotReady=0,
                message="No rows to add.",
            )

        ready_rows: List[Tuple[int, List[Any]]] = []
        skipped_not_ready = 0

        for i, row in enumerate(add_values):
            sheet_row_number = 2 + i
            row = _pad_row(row, ADD_LAST_COL_INDEX + 1)
            if not _is_ready_cell(row[ADD_READY_TO_COMMIT]):
                skipped_not_ready += 1
                continue
            ready_rows.append((sheet_row_number, row))

        if not ready_rows:
            return AddMuseumsResponse(
                ok=True,
                addedCount=0,
                errorsByRow=[],
                skippedNotReady=skipped_not_ready,
                message="No rows marked ready to commit.",
            )

        errors_by_row: List[RowError] = []
        actions: List[Tuple[int, List[Any]]] = []

        for sheet_row_number, row in ready_rows:
            errs = validate_add_row(row)
            if errs:
                errors_by_row.append(RowError(row=sheet_row_number, errors=errs))
            else:
                actions.append((sheet_row_number, row))

        if not actions:
            return AddMuseumsResponse(
                ok=True,
                addedCount=0,
                errorsByRow=errors_by_row,
                skippedNotReady=skipped_not_ready,
                message="No valid rows marked ready to commit.",
            )

        # ✅ Allocate IDs via OO allocator
        new_ids = self.id_allocator.allocate(
            spreadsheet_id=spreadsheet_id,
            count=len(actions),
        )

        added_count = 0

        if not req.dryRun:
            for museum_id, (sheet_row_number, add_row) in zip(new_ids, actions):
                db_row = map_add_row_to_db_row(add_row, museum_id=museum_id)
                self.sheets.append_row(spreadsheet_id, DB_SHEET_NAME, db_row)
                added_count += 1

            add_sheet_id = self.sheets.get_sheet_id_by_name(
                spreadsheet_id, ADD_SHEET_NAME
            )
            for sheet_row_number, _ in sorted(
                actions, key=lambda x: x[0], reverse=True
            ):
                start = sheet_row_number - 1
                end = sheet_row_number
                self.sheets.delete_rows(spreadsheet_id, add_sheet_id, start, end)

            now = datetime.now(timezone.utc).isoformat(timespec="seconds")
            self.sheets.batch_update_values(
                spreadsheet_id,
                updates=[
                    (f"{INSTRUCTIONS_SHEET_NAME}!{INSTRUCTIONS_DATE_A1}", [[now]])
                ],
            )
        else:
            added_count = len(actions)

        message = (
            f"Dry run: would add {added_count} museum(s) to Database."
            if req.dryRun
            else f"Added {added_count} museum(s) to Database."
        )

        return AddMuseumsResponse(
            ok=True,
            addedCount=added_count,
            errorsByRow=errors_by_row,
            skippedNotReady=skipped_not_ready,
            message=message,
        )
