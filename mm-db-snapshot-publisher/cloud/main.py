import json
import os
import time

from dotenv import load_dotenv
import pandas as pd

from mm_db_snapshot_publisher import GoogleUtils, PostcodeToLatLong


if __name__ == "__main__":
    start = time.time()

    load_dotenv()

    spreadsheet_id = os.environ["MAPPING_MUSEUMS_SPREADSHEET_ID"]
    database_tab = os.environ["MAPPING_MUSEUMS_DATABASE_TAB"]
    output_directory_id = os.environ["OUTPUT_DIRECTORY_ID"]
    postcode_to_lat_long_directory = os.environ["POSTCODE_TO_LAT_LONG_DIRECTORY"]

    museums_data = GoogleUtils.read_sheet_to_df(spreadsheet_id, database_tab)

    with PostcodeToLatLong(
        "../../data/ONSPD_FEB_2024_UK",
        GoogleUtils.get_drive_service,
        postcode_to_lat_long_directory,
    ) as p:
        geo_df = museums_data["postcode"].map(p.get_geo_info).apply(pd.Series)

    museums_data = pd.concat([museums_data, geo_df], axis=1)
    print(museums_data)

    end = time.time()
    period = end - start
    print(f"Completed in {period} seconds.")
