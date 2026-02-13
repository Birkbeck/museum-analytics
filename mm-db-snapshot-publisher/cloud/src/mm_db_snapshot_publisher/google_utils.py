import io
import os
import socket
import ssl
import time
from typing import Optional

import pandas as pd
import httplib2
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseUpload


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
    def get_drive_service(cls, fresh: bool = False):
        """
        Return a Google Drive API service.

        If fresh=True, bypass the cache and build a new client.
        """
        if fresh or cls._drive_service is None:
            svc = build("drive", "v3", credentials=cls._creds())
            if not fresh:
                cls._drive_service = svc
            return svc
        return cls._drive_service

    @classmethod
    def get_sheets_service(cls, fresh: bool = False):
        """
        Return a Google Sheets API service.

        If fresh=True, bypass the cache and build a new client.
        """
        if fresh or cls._sheets_service is None:
            svc = build("sheets", "v4", credentials=cls._creds())
            if not fresh:
                cls._sheets_service = svc
            return svc
        return cls._sheets_service

    @classmethod
    def _is_transient_upload_error(cls, e: Exception) -> bool:
        # Network/socket-ish issues
        if isinstance(
            e,
            (
                BrokenPipeError,
                ConnectionError,
                TimeoutError,
                socket.timeout,
                ssl.SSLError,
                ssl.SSLEOFError,
            ),
        ):
            return True
        # httplib2 transport errors (common under googleapiclient)
        if isinstance(e, (httplib2.HttpLib2Error, httplib2.ServerNotFoundError)):
            return True
        # Some 5xx / 429 are transient
        if isinstance(e, HttpError):
            try:
                status = int(getattr(e.resp, "status", 0))
            except Exception:
                status = 0
            if status in (429, 500, 502, 503, 504):
                return True
        return False

    @classmethod
    def read_sheet_to_df(
        cls,
        spreadsheet_id: str,
        tab_name: str,
        *,
        retries: int = 3,
        backoff_base_seconds: float = 1.0,
        sheets_service: Optional[object] = None,
    ) -> pd.DataFrame:
        last_exc = None
        for attempt in range(retries):
            try:
                if sheets_service is not None and attempt == 0:
                    sheets = sheets_service
                else:
                    sheets = cls.get_sheets_service(fresh=(attempt > 0))
                response = (
                    sheets.spreadsheets()
                    .values()
                    .get(spreadsheetId=spreadsheet_id, range=tab_name)
                    .execute()
                )
                values = response.get("values", [])
                if not values:
                    return pd.DataFrame()
                return pd.DataFrame(values[1:], columns=values[0])
            except Exception as e:
                last_exc = e
                if not cls._is_transient_upload_error(e) or attempt == retries - 1:
                    raise
                time.sleep(backoff_base_seconds * (2**attempt))
        raise last_exc

    @classmethod
    def save_df_to_drive_as_csv(
        cls,
        df: pd.DataFrame,
        file_id: str,
        *,
        retries: int = 3,
        resumable: bool = True,
        backoff_base_seconds: float = 1.0,
        drive_service: Optional[object] = None,
    ):
        csv_bytes = df.to_csv(index=False).encode("utf-8")
        last_exc = None
        for attempt in range(retries):
            try:
                if drive_service is not None and attempt == 0:
                    drive = drive_service
                else:
                    drive = cls.get_drive_service(fresh=(attempt > 0))
                media = MediaIoBaseUpload(
                    io.BytesIO(csv_bytes),
                    mimetype="text/csv",
                    resumable=resumable,
                )
                request = drive.files().update(
                    fileId=file_id,
                    media_body=media,
                    fields="id,name,modifiedTime",
                )
                if resumable:
                    response = None
                    while response is None:
                        _, response = request.next_chunk()
                    return response
                return request.execute()
            except Exception as e:
                last_exc = e
                if not cls._is_transient_upload_error(e) or attempt == retries - 1:
                    raise
                time.sleep(backoff_base_seconds * (2**attempt))
        raise last_exc

    @classmethod
    def save_bytes_to_drive(
        cls,
        data: bytes,
        file_id: str,
        *,
        mimetype: str,
        retries: int = 3,
        resumable: bool = True,
        backoff_base_seconds: float = 1.0,
        drive_service: Optional[object] = None,
    ):
        last_exc = None
        for attempt in range(retries):
            try:
                drive = (
                    drive_service
                    if (drive_service is not None and attempt == 0)
                    else cls.get_drive_service(fresh=(attempt > 0))
                )
                media = MediaIoBaseUpload(
                    io.BytesIO(data), mimetype=mimetype, resumable=resumable
                )
                request = drive.files().update(
                    fileId=file_id, media_body=media, fields="id,name,modifiedTime"
                )

                if resumable:
                    resp = None
                    while resp is None:
                        _, resp = request.next_chunk()
                    return resp

                return request.execute()
            except Exception as e:
                last_exc = e
                if not cls._is_transient_upload_error(e) or attempt == retries - 1:
                    raise
                time.sleep(backoff_base_seconds * (2**attempt))
        raise last_exc

    @classmethod
    def save_text_to_drive(
        cls,
        text: str,
        file_id: str,
        *,
        mimetype: str = "text/plain; charset=utf-8",
        **kwargs,
    ):
        return cls.save_bytes_to_drive(
            text.encode("utf-8"), file_id, mimetype=mimetype, **kwargs
        )
