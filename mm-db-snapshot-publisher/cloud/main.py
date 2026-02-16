import os
import time

import pandas as pd
from google.cloud import storage

from mm_db_snapshot_publisher import (
    GoogleUtils,
    MuseumSearchPreprocessor,
    PostcodeGeoDB,
)


def _resolve_postcode_sqlite_path() -> str:
    """
    Resolve the local sqlite path.

    Behaviour:
    - If POSTCODE_GEO_DB is set, use it.
    - Otherwise default to /tmp/postcode_lookup.sqlite.
    - If the file does not exist locally and POSTCODE_GEO_DB_GCS_URI is set,
      download it from GCS.
    """
    local_path = os.environ.get("POSTCODE_GEO_DB", "/tmp/postcode_lookup.sqlite")
    if os.path.exists(local_path):
        return local_path
    gcs_uri = os.environ.get("POSTCODE_GEO_DB_GCS_URI")
    if not gcs_uri:
        raise RuntimeError(
            f"SQLite DB not found at {local_path} and "
            "POSTCODE_GEO_DB_GCS_URI not set."
        )
    if not gcs_uri.startswith("gs://"):
        raise ValueError("POSTCODE_GEO_DB_GCS_URI must start with gs://")
    bucket_name, blob_name = gcs_uri[5:].split("/", 1)
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    blob.download_to_filename(local_path)
    return local_path


def publish(request):
    """
    Cloud Function entrypoint (HTTP).
    """
    start = time.time()

    # basic auth via shared secret header
    expected = os.environ.get("PUBLISH_TOKEN")
    if expected:
        token = request.headers.get("X-Publish-Token")
        if token != expected:
            return ("Unauthorized", 401)

    spreadsheet_id = os.environ["MAPPING_MUSEUMS_SPREADSHEET_ID"]
    database_tab = os.environ["MAPPING_MUSEUMS_DATABASE_TAB"]

    museums_data = GoogleUtils.read_sheet_to_df(spreadsheet_id, database_tab).rename(
        columns={"id": "museum_id", "name": "museum_name"}
    )

    with PostcodeGeoDB(_resolve_postcode_sqlite_path()) as p:
        geo_df = (
            museums_data["postcode"].fillna("").map(p.get_geo_info).apply(pd.Series)
        )

    museums_data = pd.concat([museums_data, geo_df], axis=1).fillna("")

    search_preprocessor = MuseumSearchPreprocessor.setup(
        museums_data,
        [
            "museum_name",
            "governance",
            "size",
            "subject",
            "accreditation",
            "region",
            "address_1",
            "address_2",
            "address_3",
            "village_town_city",
            "postcode",
            "lad",
            "notes",
        ],
        ngram_range=(1, 2),
    )

    search_structures = search_preprocessor.vectorize_museums()
    X = search_structures["matrix"]
    ids = search_structures["ids"]
    vocab = search_structures["vocab"]
    idf = search_structures["idf"]

    drive = GoogleUtils.get_drive_service()

    GoogleUtils.save_bytes_to_drive(
        MuseumSearchPreprocessor.sparse_to_mtx_bytes(X),
        os.environ["TFIDF_MTX_FILE_ID"],
        mimetype="text/plain",
        drive_service=drive,
    )
    GoogleUtils.save_df_to_drive_as_csv(
        pd.DataFrame({"museum_id": pd.Series(ids).fillna("").astype(str)}),
        file_id=os.environ["TFIDF_MUSEUM_IDS_FILE_ID"],
        drive_service=drive,
    )
    GoogleUtils.save_df_to_drive_as_csv(
        pd.DataFrame({"term": vocab}),
        file_id=os.environ["TFIDF_VOCAB_FILE_ID"],
        drive_service=drive,
    )
    GoogleUtils.save_df_to_drive_as_csv(
        pd.DataFrame({"idf": idf}),
        file_id=os.environ["TFIDF_IDF_FILE_ID"],
        drive_service=drive,
    )
    GoogleUtils.save_df_to_drive_as_csv(
        museums_data,
        file_id=os.environ["MUSEUMS_FILE_ID"],
        drive_service=drive,
    )

    timestamp = time.strftime("%Y-%m-%d_%H-%M-%S")
    GoogleUtils.save_df_to_drive_as_csv(
        museums_data,
        directory_id=os.environ["MM_DB_SNAPSHOTS"],
        filename=f"mapping_museums_database_{timestamp}.csv",
        drive_service=drive,
    )

    elapsed = time.time() - start
    return (
        {"status": "success", "seconds": elapsed, "rows": int(len(museums_data))},
        200,
    )
