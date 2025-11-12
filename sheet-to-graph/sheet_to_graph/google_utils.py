import os

from google.oauth2 import service_account
from googleapiclient.discovery import build


class GoogleUtils:
    _drive_service = None
    _sheets_service = None
    _SCOPES = [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive",
    ]

    @classmethod
    def _creds(cls):
        creds_file_path = os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
        return service_account.Credentials.from_service_account_file(
            creds_file_path, scopes=cls._SCOPES
        )

    @classmethod
    def get_drive_service(cls):
        if cls._drive_service is None:
            cls._drive_service = build("drive", "v3", credentials=cls._creds())
        return cls._drive_service

    @classmethod
    def get_sheets_service(cls):
        if cls._sheets_service is None:
            cls._sheets_service = build("sheets", "v4", credentials=cls._creds())
        return cls._sheets_service
