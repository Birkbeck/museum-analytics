import csv

from .base import SheetSource


class CsvSheetSource(SheetSource):
    def __init__(self, filename: str):
        self.filename = filename

    def get_rows(self):
        with open(self.filename, "r", encoding="utf-8-sig") as f:
            return list(csv.reader(f, skipinitialspace=True))
