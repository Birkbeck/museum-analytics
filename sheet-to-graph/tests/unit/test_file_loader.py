import json
import csv

import openpyxl
import pytest

from sheet_to_graph.file_loader import FileLoader  # adjust to your actual module path


def test_from_config_file_loads_values(tmp_path):
    """from_config_file should read JSON and store it in .values."""
    config_data = {
        "sheets": {},
        "dispersal_sheet_anon": "anon.xlsx",
    }

    config_path = tmp_path / "config.json"
    config_path.write_text(json.dumps(config_data), encoding="utf-8")

    loader = FileLoader.from_config_file(str(config_path))

    assert isinstance(loader, FileLoader)
    assert loader.values == config_data


def test_get_sheet_as_list_of_lists_csv(tmp_path):
    """When sheet['sheet'] is empty, it should load from a CSV file."""
    csv_path = tmp_path / "test.csv"
    csv_contents = "col1,col2\n1,2\n3,4\n"
    csv_path.write_text(csv_contents, encoding="utf-8")

    values = {
        "sheets": {
            "my_sheet": {
                "file": str(csv_path),
                "sheet": "",  # empty => CSV file
            }
        },
        "dispersal_sheet_anon": "unused.csv",
    }

    loader = FileLoader(values)

    rows = loader.get_sheet_as_list_of_lists("my_sheet")

    assert rows == [
        ["col1", "col2"],
        ["1", "2"],
        ["3", "4"],
    ]


def test_get_sheet_as_list_of_lists_xlsx(tmp_path):
    """When sheet['sheet'] is non-empty, it should load from XLSX."""
    xlsx_path = tmp_path / "test.xlsx"

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "DataSheet"
    ws.append(["col1", "col2"])
    ws.append([1, 2])
    ws.append([None, None])  # this row should be filtered out
    wb.save(xlsx_path)

    values = {
        "sheets": {
            "data_sheet": {
                "file": str(xlsx_path),
                "sheet": "DataSheet",
            }
        },
        "dispersal_sheet_anon": "unused.csv",
    }

    loader = FileLoader(values)

    rows = loader.get_sheet_as_list_of_lists("data_sheet")

    # All values are cast to str, None -> ""
    assert rows == [
        ["col1", "col2"],
        ["1", "2"],
    ]


def test_uses_dispersal_sheet_anon_when_file_is_blank(tmp_path):
    """If 'file' is '', it should fall back to dispersal_sheet_anon."""
    fallback_csv = tmp_path / "fallback.csv"
    fallback_csv.write_text("a,b\nx,y\n", encoding="utf-8")

    values = {
        "sheets": {
            "fallback_sheet": {
                "file": "",  # triggers fallback
                "sheet": "",  # CSV mode
            }
        },
        "dispersal_sheet_anon": str(fallback_csv),
    }

    loader = FileLoader(values)

    rows = loader.get_sheet_as_list_of_lists("fallback_sheet")

    assert rows == [
        ["a", "b"],
        ["x", "y"],
    ]


def test_raises_key_error_for_unknown_sheet_name():
    """Accessing an unknown sheet should raise a KeyError"""
    values = {
        "sheets": {},
        "dispersal_sheet_anon": "whatever.csv",
    }
    loader = FileLoader(values)

    with pytest.raises(KeyError):
        loader.get_sheet_as_list_of_lists("no_such_sheet")
