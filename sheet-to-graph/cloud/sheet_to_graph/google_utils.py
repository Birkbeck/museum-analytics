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
        """
        Overwrite an existing Google Drive file (by file_id) with a CSV version of df.

        Key behavior:
        - Upload is performed from memory (no temp file).
        - On transient errors (BrokenPipe, SSL, 5xx, 429), retry with exponential backoff.
        - On retry, a FRESH Drive client is created to avoid stale connections.
        Args:
            df: pandas DataFrame
            file_id: ID of the file on Google Drive to replace
            retries: number of attempts total
            resumable: use resumable upload (recommended for reliability)
            backoff_base_seconds: exponential backoff base
            drive_service: optionally provide a drive service; if omitted, uses cached service initially
        """
        csv_bytes = df.to_csv(index=False).encode("utf-8")
        media = MediaIoBaseUpload(
            io.BytesIO(csv_bytes),
            mimetype="text/csv",
            resumable=resumable,
        )
        last_exc = None
        for attempt in range(retries):
            try:
                # Use provided drive service for the first attempt if given.
                # Otherwise use cached service first, then fresh on retry.
                if drive_service is not None and attempt == 0:
                    drive = drive_service
                else:
                    drive = cls.get_drive_service(fresh=(attempt > 0))
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
                # exponential backoff: 1s, 2s, 4s...
                sleep_s = backoff_base_seconds * (2**attempt)
                time.sleep(sleep_s)
        # Should never reach here
        raise last_exc
