from mm_db_cloud.services.sheets_service import SheetsService
from mm_db_cloud.models.common import AppendOp, UpdateOp, ClearOp, DeleteRowsOp


def test_apply_ops_groups_and_orders(monkeypatch):
    calls = []

    # Create an instance without running __init__ (which builds google client)
    svc = SheetsService.__new__(SheetsService)

    def fake_batch_update_values(spreadsheet_id, updates):
        calls.append(("batch_update_values", spreadsheet_id, updates))
        return {"value": "ok"}

    def fake_clear_range(spreadsheet_id, range_a1):
        calls.append(("clear_range", spreadsheet_id, range_a1))
        return {"clear": "ok"}

    def fake_batch_update_structural(spreadsheet_id, requests):
        calls.append(("batch_update_structural", spreadsheet_id, requests))
        return {"struct": "ok"}

    def fake_append_row(spreadsheet_id, sheet_name, row_values):
        calls.append(("append_row", spreadsheet_id, sheet_name, row_values))
        return {"append": "ok"}

    monkeypatch.setattr(svc, "batch_update_values", fake_batch_update_values)
    monkeypatch.setattr(svc, "clear_range", fake_clear_range)
    monkeypatch.setattr(svc, "batch_update_structural", fake_batch_update_structural)
    monkeypatch.setattr(svc, "append_row", fake_append_row)

    ops = [
        AppendOp(type="append", sheetName="Database", rowValues=["A"]),
        UpdateOp(type="update", rangeA1="DB!A2:A2", values=[["X"]]),
        ClearOp(type="clear", rangeA1="Add!A10:Z10"),
        DeleteRowsOp(type="deleteRows", sheetId=123, startIndex=9, endIndex=10),
        AppendOp(type="append", sheetName="Database", rowValues=["B"]),
    ]

    result = svc.apply_ops("spreadsheet-1", ops)

    # Expected order: batch values -> clears -> structural -> appends
    assert [c[0] for c in calls] == [
        "batch_update_values",
        "clear_range",
        "batch_update_structural",
        "append_row",
        "append_row",
    ]

    # Check that the update got aggregated
    assert calls[0][2] == [("DB!A2:A2", [["X"]])]

    # Structural request shape sanity check
    structural_requests = calls[2][2]
    assert structural_requests[0]["deleteDimension"]["range"]["sheetId"] == 123

    assert result["valueUpdates"] == {"value": "ok"}
    assert len(result["clears"]) == 1
    assert result["structural"] == {"struct": "ok"}
    assert len(result["appends"]) == 2
