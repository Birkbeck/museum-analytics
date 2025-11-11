from .base import SheetSource


class GoogleSheetSource(SheetSource):
    def __init__(self, service, spreadsheet_id: str, range_: str):
        self.service = service
        self.spreadsheet_id = spreadsheet_id
        self.range_ = range_

    def get_rows(self):
        sheet = self.service.spreadsheets()
        result = (
            sheet.values()
            .get(
                spreadsheetId=self.spreadsheet_id,
                range=self.range_,
            )
            .execute()
        )
        values = result.get("values", [])
        return values
