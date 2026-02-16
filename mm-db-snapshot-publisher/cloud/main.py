import os
import time

import pandas as pd

from mm_db_snapshot_publisher import (
    GoogleUtils,
    MuseumSearchPreprocessor,
    PostcodeGeoDB,
)


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
    postcode_geo_db = os.environ["POSTCODE_GEO_DB"]

    museums_data = GoogleUtils.read_sheet_to_df(spreadsheet_id, database_tab).rename(
        columns={"id": "museum_id", "name": "museum_name"}
    )

    with PostcodeGeoDB(postcode_geo_db) as p:
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
