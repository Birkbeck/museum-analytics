import csv
import io
import json
from typing import Any, Dict, Optional, Set

from bng_latlon import WGS84toOSGB36
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload

from .wikidata_connection import WikidataConnection


class PostcodeToLatLong:
    """Mapping from postcodes/towns/cities to lat/long and other geo info.

    Modified to persist lookup JSON files in Google Drive instead of locally.
    Requires a Drive API v3 service in __init__ (e.g. build("drive","v3", credentials=...)).

    Notes:
    - By default, lookup files are stored in the Drive root.
    - If you pass drive_folder_id, lookup files are stored in that folder.
    - Lookup file names are: postcode_lookup.json, city_country_lookup.json, town_county_lookup.json
    """

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

    def __init__(
        self,
        postcode_directory_path: str,
        wikidata_connection: WikidataConnection,
        drive_service_factory,
        drive_folder_id: Optional[str] = None,
    ):
        self.postcode_directory_path = postcode_directory_path
        self.wikidata_connection = wikidata_connection
        self.drive_service_factory = drive_service_factory
        self.drive_folder_id = drive_folder_id
        self._saved_lookups: Dict[str, Dict[str, Any]] = {}
        self._drive_file_ids: Dict[str, str] = {}  # lookup_name -> fileId cache
        self._lads_map = None
        self._lads_to_regions_map = None
        # Track which lookups have been modified since last save
        self._dirty_lookups: Set[str] = set()

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
        for lookup_name in list(self._dirty_lookups):
            file_id = self._ensure_drive_file(lookup_name)
            self._drive_write_json(file_id, self._saved_lookups.get(lookup_name, {}))
        self._dirty_lookups.clear()

    # ---------------------------
    # Public lookup accessors
    # ---------------------------
    @property
    def postcode_lookup(self):
        return self.get_lookup("postcode")

    @property
    def city_country_lookup(self):
        return self.get_lookup("city_country")

    @property
    def town_county_lookup(self):
        return self.get_lookup("town_county")

    def get_lookup(self, lookup_name: str):
        try:
            return self._saved_lookups[lookup_name]
        except KeyError:
            self._open_lookup(lookup_name)
        return self._saved_lookups[lookup_name]

    # ---------------------------
    # Public getters
    # ---------------------------
    def get_latitude(self, postcode: str, town_city: str, county: str, country: str):
        return self._get_geo_info(postcode, town_city, county, country)["lat"]

    def get_longitude(self, postcode: str, town_city: str, county: str, country: str):
        return self._get_geo_info(postcode, town_city, county, country)["long"]

    def get_bng_x(self, postcode: str, town_city: str, county: str, country: str):
        return self._get_geo_info(postcode, town_city, county, country)["bng_x"]

    def get_bng_y(self, postcode: str, town_city: str, county: str, country: str):
        return self._get_geo_info(postcode, town_city, county, country)["bng_y"]

    def get_region(self, postcode: str, town_city: str, county: str, country: str):
        try:
            if postcode[:2] == "IM":
                return "Isle of Man"
            if postcode[:2] in ("GY", "JE"):
                return "Channel Islands"
        except IndexError:
            pass
        return self._get_geo_info(postcode, town_city, county, country)["region"]

    def get_local_authority_code(
        self, postcode: str, town_city: str, county: str, country: str
    ):
        return self._get_geo_info(postcode, town_city, county, country)["lad23cd"]

    def get_local_authority_name(
        self, postcode: str, town_city: str, county: str, country: str
    ):
        return self._get_geo_info(postcode, town_city, county, country)["lad23nm"]

    def _get_geo_info(self, postcode: str, town_city: str, county: str, country: str):
        if country not in ("", "England", "Scotland", "Wales", "Northern Ireland"):
            # find coordinates of non-UK locations
            key = f"{town_city}, {country}" if town_city != "" else country
            try:
                info = self.city_country_lookup[key]
            except KeyError:
                self._add_new_city_country(key)
                info = self._get_geo_info(postcode, town_city, county, country)
            return info
        if postcode != "":
            # find geographical information for UK locations with postcodes
            try:
                info = self.postcode_lookup[postcode]
            except KeyError:
                self._add_new_postcode(postcode)
                info = self._get_geo_info(postcode, town_city, county, country)
            return info
        if town_city != "" or county != "":
            # find geographical information for UK locations without postcodes
            if town_city != "" and county != "":
                key = f"{town_city}, {county}"
            elif town_city != "":
                key = town_city
            else:
                key = county
            try:
                info = self.town_county_lookup[key]
            except KeyError:
                self._add_new_town_county(key)
                info = self._get_geo_info(postcode, town_city, county, country)
            return info
        return {
            "lat": None,
            "long": None,
            "bng_x": None,
            "bng_y": None,
            "region": None,
            "lad23cd": None,
            "lad23nm": None,
        }

    def _lookup_filename(self, lookup_name: str) -> str:
        return f"{lookup_name}_lookup.json"

    def _drive_find_file_id_by_name(self, filename: str) -> Optional[str]:
        for lookup_name, cached_id in self._drive_file_ids.items():
            if self._lookup_filename(lookup_name) == filename:
                return cached_id
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

    def _ensure_drive_file(self, lookup_name: str) -> str:
        """Ensure we have a Drive fileId for this lookup; create if missing."""
        if lookup_name in self._drive_file_ids:
            return self._drive_file_ids[lookup_name]
        filename = self._lookup_filename(lookup_name)
        file_id = self._drive_find_file_id_by_name(filename)
        if file_id is None:
            # create with current in-memory data (or empty if not loaded yet)
            data = self._saved_lookups.get(lookup_name, {})
            file_id = self._drive_create_json_file(filename, data)
        self._drive_file_ids[lookup_name] = file_id
        return file_id

    def _open_lookup(self, lookup_name: str):
        filename = self._lookup_filename(lookup_name)

        try:
            file_id = self._drive_find_file_id_by_name(filename)
            if file_id is None:
                # Create empty lookup file on Drive
                file_id = self._drive_create_json_file(filename, {})
            self._drive_file_ids[lookup_name] = file_id
            self._saved_lookups[lookup_name] = self._drive_read_json(file_id)
        except Exception:
            # Fail-safe: keep things running in-memory if Drive is unavailable
            self._saved_lookups[lookup_name] = {}

    def _mark_dirty(self, lookup_name: str) -> None:
        self._dirty_lookups.add(lookup_name)

    def _add_new_postcode(self, postcode: str):
        blank_details = {
            "lat": None,
            "long": None,
            "bng_x": None,
            "bng_y": None,
            "region": None,
            "lad23cd": None,
            "lad23nm": None,
        }
        if postcode == "":
            return self._update_saved_info("postcode", postcode, blank_details)
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
                            "postcode",
                            postcode,
                            {
                                "lat": lat,
                                "long": lon,
                                "bng_x": bng[0],
                                "bng_y": bng[1],
                                "region": self.regions_map[row["rgn"]],
                                "lad23cd": row["oslaua"],
                                "lad23nm": self.lads_map.get(row["oslaua"], None),
                            },
                        )
        except FileNotFoundError:
            print(f"No postcode directory found for postcode '{initial_letter}'")
        except Exception as e:
            print(str(e))

        return self._update_saved_info("postcode", postcode, blank_details)

    def _add_new_city_country(self, key: str):
        region = (
            "Channel Islands"
            if "Channel Islands" in key
            else "Isle of Man"
            if "Isle of Man" in key
            else None
        )
        lad = region
        geo_info = {
            "lat": None,
            "long": None,
            "bng_x": None,
            "bng_y": None,
            "region": region,
            "lad23cd": None,
            "lad23nm": lad,
        }
        results = None
        try:
            results = self.wikidata_connection.search_entities(key)
        except Exception as e:
            print(e)

        results = results if results is not None else []
        for result in results:
            properties = self.wikidata_connection.get_entity_properties(result["id"])
            try:
                coordinates = properties["P625"]
                geo_info["lat"] = coordinates["latitude"]
                geo_info["long"] = coordinates["longitude"]
                bng = WGS84toOSGB36(geo_info["lat"], geo_info["long"])
                geo_info["bng_x"] = bng[0]
                geo_info["bng_y"] = bng[1]
                break
            except KeyError:
                continue

        return self._update_saved_info("city_country", key, geo_info)

    def _add_new_town_county(self, key: str):
        # town -> located in the administrative territorial entity (P131) -> LAD
        # -> population (P1082) less than 100,000 then get coordinates (P625)
        geo_info = {
            "lat": None,
            "long": None,
            "bng_x": None,
            "bng_y": None,
            "region": None,
            "lad23cd": None,
            "lad23nm": None,
        }
        for lad_code, lad_name in self.lads_map.items():
            lad_name = lad_name.split(", ")[0]  # remove ", City of" from lad names
            keys = key.split(", ")  # split town/city from county
            for k in keys:
                if k == lad_name:
                    geo_info["lad23cd"] = lad_code
                    geo_info["lad23nm"] = lad_name
                    geo_info["region"] = self.lads_to_regions_map[lad_code]
                    break

        results = self.wikidata_connection.search_entities(key)
        results = results if results is not None else []
        for result in results:
            properties = self.wikidata_connection.get_entity_properties(result["id"])
            try:
                population = int(properties["P1082"]["amount"][1:]) * int(
                    properties["P1082"]["unit"]
                )
                if population < 1e5:
                    # large towns/cities/counties such as London, Cornwall are too big for accurate coordinates
                    coordinates = properties["P625"]
                    geo_info["lat"] = coordinates["latitude"]
                    geo_info["long"] = coordinates["longitude"]
                    bng = WGS84toOSGB36(geo_info["lat"], geo_info["long"])
                    geo_info["bng_x"] = bng[0]
                    geo_info["bng_y"] = bng[1]
                break
            except KeyError:
                continue

        return self._update_saved_info("town_county", key, geo_info)

    def _update_saved_info(self, lookup_name: str, key: str, geo_info: dict):
        lookup = self.get_lookup(lookup_name)
        lookup[key] = geo_info
        self._mark_dirty(lookup_name)

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
