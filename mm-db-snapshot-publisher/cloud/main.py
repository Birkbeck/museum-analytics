import os
import time

from dotenv import load_dotenv
import pandas as pd

from mm_db_snapshot_publisher import (
    GoogleUtils,
    MuseumSearchPreprocessor,
    PostcodeToLatLong,
)


if __name__ == "__main__":
    start = time.time()
    load_dotenv()

    spreadsheet_id = os.environ["MAPPING_MUSEUMS_SPREADSHEET_ID"]
    database_tab = os.environ["MAPPING_MUSEUMS_DATABASE_TAB"]
    postcode_to_lat_long_directory = os.environ["POSTCODE_TO_LAT_LONG_DIRECTORY"]

    museums_data = GoogleUtils.read_sheet_to_df(spreadsheet_id, database_tab).rename(
        columns={"id": "museum_id", "name": "museum_name"}
    )

    with PostcodeToLatLong(
        "../../data/ONSPD_FEB_2024_UK",
        GoogleUtils.get_drive_service,
        postcode_to_lat_long_directory,
    ) as p:
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
        os.environ["TFIDF_MUSEUM_IDS_FILE_ID"],
        drive_service=drive,
    )
    GoogleUtils.save_df_to_drive_as_csv(
        pd.DataFrame({"term": vocab}),
        os.environ["TFIDF_VOCAB_FILE_ID"],
        drive_service=drive,
    )
    GoogleUtils.save_df_to_drive_as_csv(
        pd.DataFrame({"idf": idf}),
        os.environ["TFIDF_IDF_FILE_ID"],
        drive_service=drive,
    )
    GoogleUtils.save_df_to_drive_as_csv(
        museums_data,
        os.environ["MUSEUMS_FILE_ID"],
        drive_service=drive,
    )

    print(f"Completed in {time.time() - start} seconds.")
