from .base import SheetSource
from .csv_sheet_source import CsvSheetSource
from .excel_sheet_source import ExcelSheetSource
from .google_sheet_source import GoogleSheetSource


def make_sheet_source(sheet_conf, *, google_service=None) -> SheetSource:
    backend = sheet_conf.get("backend", "csv")

    if backend == "csv":
        return CsvSheetSource(sheet_conf["file"])

    if backend == "excel":
        return ExcelSheetSource(sheet_conf["file"], sheet_conf["sheet"])

    if backend == "google":
        if google_service is None:
            raise ValueError("google_service is required for Google backend")
        return GoogleSheetSource(
            google_service,
            sheet_conf["spreadsheet_id"],
            sheet_conf["range"],
        )

    raise ValueError(f"Unknown backend: {backend}")
