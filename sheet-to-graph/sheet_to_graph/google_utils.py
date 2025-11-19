import os

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

import pandas as pd


class GoogleUtils:
    """
    Utilities for building Google API service clients using a user's OAuth credentials.
    """

    _drive_service = None
    _sheets_service = None

    _SCOPES = [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
    ]

    @classmethod
    def _creds(cls):
        """
        Build Credentials from the OAuth client ID / secret / refresh token
        stored in environment variables (or Secret Manager).
        """
        client_id = os.environ["OAUTH_CLIENT_ID"]
        client_secret = os.environ["OAUTH_CLIENT_SECRET"]
        refresh_token = os.environ["OAUTH_REFRESH_TOKEN"]

        creds = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret,
            scopes=cls._SCOPES,
        )
        creds.refresh(Request())
        return creds

    @classmethod
    def get_drive_service(cls):
        """Return a cached Google Drive API service."""
        if cls._drive_service is None:
            cls._drive_service = build("drive", "v3", credentials=cls._creds())
        return cls._drive_service

    @classmethod
    def get_sheets_service(cls):
        """Return a cached Google Sheets API service."""
        if cls._sheets_service is None:
            cls._sheets_service = build("sheets", "v4", credentials=cls._creds())
        return cls._sheets_service

    @classmethod
    def save_df_to_drive_as_csv(cls, df: pd.DataFrame, filename: str, folder_id: str):
        """
        Save a pandas DataFrame as a CSV file into a Google Drive folder.

        Args:
        df: pandas DataFrame
        filename: e.g., "dispersal_events.csv"
        folder_id: Google Drive directory ID
        service_account_file: path to service account JSON key
        """
        df.to_csv(filename, index=False)
        drive = cls.get_drive_service()
        file_metadata = {
            "name": filename,
            "parents": [folder_id],
        }
        media = MediaFileUpload(filename, mimetype="text/csv")
        return (
            drive.files()
            .create(body=file_metadata, media_body=media, fields="id, name")
            .execute()
        )
