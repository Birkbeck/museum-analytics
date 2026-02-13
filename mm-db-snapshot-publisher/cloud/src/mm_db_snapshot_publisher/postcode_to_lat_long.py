import csv
import io
import json
from typing import Any, Dict, Optional, Set

from bng_latlon import WGS84toOSGB36
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload


class PostcodeToLatLong:
    """Mapping from postcodes/towns/cities to lat/long and other geo info.

    Modified to persist lookup JSON files in Google Drive instead of locally.
    Requires a Drive API v3 service in __init__ (e.g. build("drive","v3", credentials=...)).

    Notes:
    - By default, lookup files are stored in the Drive root.
    - If you pass drive_folder_id, lookup files are stored in that folder.
    - Lookup file names are: postcode_lookup.json, city_country_lookup.json, town_county_lookup.json
    """

    POSTCODE_LOOKUP_FILE = "postcode_lookup.json"

    regions_map = {
        "E12000001": "North East",
        "E12000002": "North West",
        "E12000003": "Yorks & Humber",
        "E12000004": "East Midlands",
        "E12000005": "West Midlands",
        "E12000006": "East of England",
        "E12000007": "London",
        "E12000008": "South East",
        "E12000009": "South West",
        "S99999999": "Scotland",
        "W99999999": "Wales",
        "N99999999": "Northern Ireland",
        "L99999999": "Channel Islands",
        "M99999999": "Isle of Man",
    }
    countries_map = {
        "E12000001": "England",
        "E12000002": "England",
        "E12000003": "England",
        "E12000004": "England",
        "E12000005": "England",
        "E12000006": "England",
        "E12000007": "England",
        "E12000008": "England",
        "E12000009": "England",
        "S99999999": "Scotland",
        "W99999999": "Wales",
        "N99999999": "Northern Ireland",
        "L99999999": "Channel Islands",
        "M99999999": "Isle of Man",
    }

    def __init__(
        self,
        postcode_directory_path: str,
        drive_service_factory,
        drive_folder_id: Optional[str] = None,
    ):
        self.postcode_directory_path = postcode_directory_path
        self.drive_service_factory = drive_service_factory
        self.drive_folder_id = drive_folder_id
        self._postcode_lookup: Dict[str, dict] = {}
        self._postcode_file_id: Optional[str] = None
        self._lads_map = None
        self._lads_to_regions_map = None
        self._postcodes_have_been_updated = False

    # -------------------------
    # Context management with flush to google drive at end
    # -------------------------
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        # don't save if an exception occurred
        if exc_type is None:
            self.save_geo_info()
        return False

    def save_geo_info(self) -> None:
        """Persist any modified lookup(s) to Google Drive."""
        if self._postcodes_have_been_updated:
            self._drive_write_json(self.postcode_file_id, self._postcode_lookup)
        self._postcodes_have_been_updated = False

    def get_geo_info(self, postcode: str):
        try:
            info = self._postcode_lookup[postcode]
        except KeyError:
            self._add_new_postcode(postcode)
            info = self.get_geo_info(postcode)
        return info

    @property
    def postcode_file_id(self):
        if self._postcode_file_id is None:
            # drive file id has still not been found
            self._postcode_file_id = self._drive_find_file_id_by_name(
                self.POSTCODE_LOOKUP_FILE
            )
        if self._postcode_file_id is None:
            # drive file id has still not been created
            self._postcode_file_id = self._drive_create_json_file(
                self.POSTCODE_LOOKUP_FILE, self._postcode_lookup
            )
        return self._postcode_file_id

    def _drive_find_file_id_by_name(self, filename: str) -> Optional[str]:
        drive_query_parts = [f'name="{filename}"', "trashed=false"]
        if self.drive_folder_id:
            drive_query_parts.append(f'"{self.drive_folder_id}" in parents')
        drive_query = " and ".join(drive_query_parts)
        resp = (
            self.drive_service_factory()
            .files()
            .list(
                q=drive_query,
                spaces="drive",
                fields="files(id,name)",
                pageSize=10,
            )
            .execute()
        )
        files = resp.get("files", [])
        if not files:
            return None
        return files[0]["id"]

    def _drive_read_json(self, file_id: str) -> Dict[str, Any]:
        request = self.drive_service_factory().files().get_media(fileId=file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        try:
            content = fh.getvalue().decode("utf-8")
        except Exception:
            content = ""
        if not content.strip():
            return {}
        try:
            data = json.loads(content)
            return data if isinstance(data, dict) else {}
        except json.JSONDecodeError:
            return {}

    def _drive_write_json(self, file_id: str, data: Dict[str, Any]) -> None:
        payload = json.dumps(data, ensure_ascii=False)
        media = MediaIoBaseUpload(
            io.BytesIO(payload.encode("utf-8")),
            mimetype="application/json",
            resumable=False,
        )
        self.drive_service_factory().files().update(
            fileId=file_id, media_body=media
        ).execute()

    def _drive_create_json_file(self, filename: str, data: Dict[str, Any]) -> str:
        payload = json.dumps(data, ensure_ascii=False)
        media = MediaIoBaseUpload(
            io.BytesIO(payload.encode("utf-8")),
            mimetype="application/json",
            resumable=False,
        )
        metadata = {"name": filename, "mimeType": "application/json"}
        if self.drive_folder_id:
            metadata["parents"] = [self.drive_folder_id]
        created = (
            self.drive_service_factory()
            .files()
            .create(body=metadata, media_body=media, fields="id")
            .execute()
        )
        return created["id"]

    def _add_new_postcode(self, postcode: str):
        blank_details = {
            "latitude": None,
            "longitude": None,
            "bng_x": None,
            "bng_y": None,
            "region": "",
            "country": "",
            "lad_code": "",
            "lad": "",
        }
        if postcode == "":
            return self._update_saved_info(postcode, blank_details)
        initial_letter = self._get_initial_letters(postcode)
        postcode_file = (
            f"{self.postcode_directory_path}/Data/multi_csv/"
            + f"ONSPD_FEB_2024_UK_{initial_letter}.csv"
        )
        try:
            with open(postcode_file, "r") as f:
                postcode_table = csv.DictReader(f)
                for row in postcode_table:
                    if postcode in {row["pcd"], row["pcd2"], row["pcds"]}:
                        lat = float(row["lat"])
                        lon = float(row["long"])
                        bng = WGS84toOSGB36(lat, lon)
                        return self._update_saved_info(
                            postcode,
                            {
                                "latitude": lat,
                                "longitude": lon,
                                "bng_x": bng[0],
                                "bng_y": bng[1],
                                "region": self.regions_map[row["rgn"]],
                                "country": self.countries_map[row["rgn"]],
                                "lad_code": row["oslaua"],
                                "lad": self.lads_map.get(row["oslaua"], ""),
                            },
                        )
        except FileNotFoundError:
            print(f"No postcode directory found for postcode '{initial_letter}'")
        except Exception as e:
            print(str(e))
        return self._update_saved_info(postcode, blank_details)

    def _update_saved_info(self, postcode: str, geo_info: dict):
        self._postcode_lookup[postcode] = geo_info
        self._postcodes_have_been_updated = True

    def _get_initial_letters(self, postcode: str):
        letters = ""
        for character in postcode:
            if character.isalpha():
                letters += character.upper()
            else:
                return letters
        return letters

    @property
    def lads_map(self):
        if self._lads_map is None:
            lads_map_file_name = "LAD23_LAU121_ITL321_ITL221_ITL121_UK_LU.csv"
            lads_map_file = (
                f"{self.postcode_directory_path}/Documents/{lads_map_file_name}"
            )
            with open(lads_map_file, "r") as f:
                lad_table = csv.DictReader(f)
                self._lads_map = {
                    row["\ufeffLAD23CD"]: row["LAD23NM"] for row in lad_table
                }
        return self._lads_map

    @property
    def lads_to_regions_map(self):
        def tidy_region_name(region_name: str):
            region_name = region_name.split(" (")[0]
            if region_name == "Yorkshire and The Humber":
                region_name = "Yorks & Humber"
            if region_name == "East":
                region_name = "East of England"
            return region_name

        if self._lads_to_regions_map is None:
            lads_map_file_name = "LAD23_LAU121_ITL321_ITL221_ITL121_UK_LU.csv"
            lads_map_file = (
                f"{self.postcode_directory_path}/Documents/{lads_map_file_name}"
            )
            with open(lads_map_file, "r") as f:
                lad_table = csv.DictReader(f)
                self._lads_to_regions_map = {
                    row["\ufeffLAD23CD"]: tidy_region_name(row["ITL121NM"])
                    for row in lad_table
                }
        return self._lads_to_regions_map
