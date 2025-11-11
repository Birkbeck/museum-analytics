import json

from sheet_to_graph.sheet_sources import make_sheet_source


class FileLoader:
    """This class loads data from the csv/xlsx files specified in a config.
    Initialize with the classmethod from_config_file.
    Use the method get_sheet_as_list_of_lists to load data from the specified sheet_name.
    The sheet_name must match with a sheet pointed to in the config file.
    """

    def __init__(self, values, google_service=None):
        self.values = values
        self.google_service = google_service

    @classmethod
    def from_config_file(cls, filename: str):
        with open(filename, "r", encoding="utf-8") as f:
            values = json.load(f)
        return cls(values)

    def get_sheet_as_list_of_lists(self, sheet_name: str):
        sheet_conf = self.values["sheets"][sheet_name]

        if sheet_conf.get("file", "") == "":
            sheet_conf["file"] = self.values["dispersal_sheet_anon"]

        source = make_sheet_source(sheet_conf, google_service=self.google_service)
        return source.load_rows()
