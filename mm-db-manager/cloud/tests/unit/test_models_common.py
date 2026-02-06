import pytest

from mm_db_cloud.models.common import parse_ops_request, parse_sheet_op
from mm_db_cloud.models.errors import RequestValidationError


def test_parse_ops_request_requires_spreadsheet_id():
    with pytest.raises(RequestValidationError):
        parse_ops_request({"ops": []})

    with pytest.raises(RequestValidationError):
        parse_ops_request({"spreadsheetId": "", "ops": []})


def test_parse_ops_request_requires_ops_list():
    with pytest.raises(RequestValidationError):
        parse_ops_request({"spreadsheetId": "abc"})

    with pytest.raises(RequestValidationError):
        parse_ops_request({"spreadsheetId": "abc", "ops": "nope"})


def test_parse_append_op():
    op = parse_sheet_op(
        {"type": "append", "sheetName": "Database", "rowValues": ["a", 1, True]}
    )
    assert op.type == "append"
    assert op.sheetName == "Database"
    assert op.rowValues == ["a", 1, True]


def test_parse_update_op_requires_sheet_in_a1():
    with pytest.raises(RequestValidationError):
        parse_sheet_op({"type": "update", "rangeA1": "A1:B1", "values": [["x"]]})

    with pytest.raises(RequestValidationError):
        parse_sheet_op({"type": "update", "rangeA1": "", "values": [["x"]]})

    op = parse_sheet_op(
        {"type": "update", "rangeA1": "DB!A2:B2", "values": [["x", "y"]]}
    )
    assert op.type == "update"
    assert op.rangeA1 == "DB!A2:B2"
    assert op.values == [["x", "y"]]


def test_parse_clear_op_requires_sheet_in_a1():
    with pytest.raises(RequestValidationError):
        parse_sheet_op({"type": "clear", "rangeA1": "A1:B2"})

    op = parse_sheet_op({"type": "clear", "rangeA1": "Add!A10:Z10"})
    assert op.type == "clear"
    assert op.rangeA1 == "Add!A10:Z10"


def test_parse_delete_rows_op_validates_indices():
    with pytest.raises(RequestValidationError):
        parse_sheet_op(
            {"type": "deleteRows", "sheetId": 1, "startIndex": 5, "endIndex": 5}
        )

    with pytest.raises(RequestValidationError):
        parse_sheet_op(
            {"type": "deleteRows", "sheetId": 1, "startIndex": -1, "endIndex": 2}
        )

    op = parse_sheet_op(
        {"type": "deleteRows", "sheetId": 123, "startIndex": 9, "endIndex": 10}
    )
    assert op.type == "deleteRows"
    assert op.sheetId == 123
    assert op.startIndex == 9
    assert op.endIndex == 10


def test_parse_unknown_op_type():
    with pytest.raises(RequestValidationError):
        parse_sheet_op({"type": "wat"})
