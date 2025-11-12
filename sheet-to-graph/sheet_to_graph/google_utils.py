import os

from google.oauth2 import service_account
from googleapiclient.discovery import build


class GoogleUtils:
    _service = None
    _SCOPES = [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        # "https://www.googleapis.com/auth/drive",
    ]

    @classmethod
    def get_service(cls):
        if cls._service is None:
            creds_file_path = os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
            creds = service_account.Credentials.from_service_account_file(
                creds_file_path, scopes=cls._SCOPES
            )
            cls._service = build("sheets", "v4", credentials=creds)
        return cls._service
