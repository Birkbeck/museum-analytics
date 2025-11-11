import json
import pytest

from sheet_to_graph.file_loader import FileLoader


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


def test_get_sheet_as_list_of_lists_delegates_to_sheet_source_factory(monkeypatch):
    """FileLoader should delegate to make_sheet_source and return get_rows()."""

    values = {
        "sheets": {
            "my_sheet": {
                "backend": "csv",
                "file": "dummy.csv",
            }
        },
        "dispersal_sheet_anon": "unused.csv",
    }

    loader = FileLoader(values, google_service="GOOGLE_SERVICE_SENTINEL")

    captured = {}

    class DummySource:
        def __init__(self, rows):
            self._rows = rows

        def get_rows(self):
            return self._rows

    def fake_make_sheet_source(sheet_conf, *, google_service=None):
        captured["sheet_conf"] = sheet_conf
        captured["google_service"] = google_service
        return DummySource([["ok"]])

    # Patch the symbol used inside file_loader
    monkeypatch.setattr(
        "sheet_to_graph.file_loader.make_sheet_source",
        fake_make_sheet_source,
    )

    rows = loader.get_sheet_as_list_of_lists("my_sheet")

    assert rows == [["ok"]]
    # It passed the right config dict
    assert captured["sheet_conf"] is values["sheets"]["my_sheet"]
    # It forwarded google_service from the loader
    assert captured["google_service"] == "GOOGLE_SERVICE_SENTINEL"


def test_uses_dispersal_sheet_anon_when_file_is_blank(monkeypatch, tmp_path):
    """If 'file' is '', FileLoader should replace it with dispersal_sheet_anon before calling the factory."""

    fallback_csv = tmp_path / "fallback.csv"
    fallback_csv.write_text("does,not,matter\n", encoding="utf-8")

    values = {
        "sheets": {
            "fallback_sheet": {
                "backend": "csv",
                "file": "",  # triggers fallback
            }
        },
        "dispersal_sheet_anon": str(fallback_csv),
    }

    loader = FileLoader(values)

    captured = {}

    class DummySource:
        def __init__(self):
            pass

        def get_rows(self):
            return [["dummy"]]

    def fake_make_sheet_source(sheet_conf, *, google_service=None):
        captured["sheet_conf"] = dict(sheet_conf)  # copy to inspect safely
        return DummySource()

    monkeypatch.setattr(
        "sheet_to_graph.file_loader.make_sheet_source",
        fake_make_sheet_source,
    )

    rows = loader.get_sheet_as_list_of_lists("fallback_sheet")

    assert rows == [["dummy"]]
    # The file field should have been replaced with the fallback path
    assert captured["sheet_conf"]["file"] == str(fallback_csv)


def test_raises_key_error_for_unknown_sheet_name():
    """Accessing an unknown sheet should raise a KeyError."""
    values = {
        "sheets": {},
        "dispersal_sheet_anon": "whatever.csv",
    }
    loader = FileLoader(values)

    with pytest.raises(KeyError):
        loader.get_sheet_as_list_of_lists("no_such_sheet")
