from __future__ import annotations

from typing import Any, List, Tuple

from mm_db_cloud.config.sheet_config import (
    ADD_ACCREDITATION,
    ADD_ACCREDITATION_CHANGE_DATE,
    ADD_ACCREDITATION_NUMBER,
    ADD_ADDRESS_1,
    ADD_ADDRESS_2,
    ADD_ADDRESS_3,
    ADD_ALTERNATIVE_NAME,
    ADD_GOVERNANCE,
    ADD_GOVERNANCE_SOURCE,
    ADD_MUSEUM_NAME,
    ADD_NOTES,
    ADD_POSTCODE,
    ADD_PREVIOUS_GOVERNANCE,
    ADD_PREVIOUS_GOVERNANCE_END,
    ADD_PREVIOUS_GOVERNANCE_START,
    ADD_PRIMARY_PROVENANCE_OF_DATA,
    ADD_SIZE,
    ADD_SIZE_SOURCE,
    ADD_SUBJECT,
    ADD_VILLAGE_TOWN_CITY,
    ADD_WIKIDATA_ID,
    ADD_YEAR_CLOSED,
    ADD_YEAR_CLOSED_SOURCE,
    ADD_YEAR_OPENED,
    ADD_YEAR_OPENED_SOURCE,
    DB_ACCREDITATION,
    DB_ACCREDITATION_CHANGE_DATE,
    DB_ACCREDITATION_NUMBER,
    DB_ADDRESS_1,
    DB_ADDRESS_2,
    DB_ADDRESS_3,
    DB_ALTERNATIVE_NAME,
    DB_GOVERNANCE,
    DB_GOVERNANCE_BROAD,
    DB_GOVERNANCE_SOURCE,
    DB_ID,
    DB_MUSEUM_NAME,
    DB_NOTES,
    DB_POSTCODE,
    DB_PREVIOUS_GOVERNANCE,
    DB_PREVIOUS_GOVERNANCE_END,
    DB_PREVIOUS_GOVERNANCE_START,
    DB_PRIMARY_PROVENANCE_OF_DATA,
    DB_SIZE,
    DB_SIZE_SOURCE,
    DB_SUBJECT,
    DB_SUBJECT_BROAD,
    DB_TOTAL_COLS,
    DB_VILLAGE_TOWN_CITY,
    DB_WIKIDATA_ID,
    DB_YEAR_CLOSED_1,
    DB_YEAR_CLOSED_2,
    DB_YEAR_CLOSED_SOURCE,
    DB_YEAR_OPENED_1,
    DB_YEAR_OPENED_2,
    DB_YEAR_OPENED_SOURCE,
)


def _get(values: List[Any], idx: int) -> Any:
    return values[idx] if idx < len(values) else ""


def split_year_range(value: Any) -> tuple[str, str]:
    if value is None:
        return ("", "")
    s = str(value).strip()
    if s == "":
        return ("", "")
    if "/" in s:
        a, b = s.split("/", 1)
        return (a.strip(), b.strip())
    return (s, s)


def map_add_row_to_db_row(add_row: List[Any], museum_id: str) -> List[Any]:
    out: List[Any] = [""] * DB_TOTAL_COLS

    out[DB_ID] = museum_id
    out[DB_MUSEUM_NAME] = _get(add_row, ADD_MUSEUM_NAME)
    out[DB_ALTERNATIVE_NAME] = _get(add_row, ADD_ALTERNATIVE_NAME)
    out[DB_WIKIDATA_ID] = _get(add_row, ADD_WIKIDATA_ID)

    out[DB_ADDRESS_1] = _get(add_row, ADD_ADDRESS_1)
    out[DB_ADDRESS_2] = _get(add_row, ADD_ADDRESS_2)
    out[DB_ADDRESS_3] = _get(add_row, ADD_ADDRESS_3)
    out[DB_VILLAGE_TOWN_CITY] = _get(add_row, ADD_VILLAGE_TOWN_CITY)
    out[DB_POSTCODE] = _get(add_row, ADD_POSTCODE)

    out[DB_ACCREDITATION] = _get(add_row, ADD_ACCREDITATION)
    out[DB_ACCREDITATION_NUMBER] = _get(add_row, ADD_ACCREDITATION_NUMBER)
    out[DB_ACCREDITATION_CHANGE_DATE] = _get(add_row, ADD_ACCREDITATION_CHANGE_DATE)

    # Broad fields: left blank unless/until you define mapping rules
    out[DB_GOVERNANCE_BROAD] = ""
    out[DB_GOVERNANCE] = _get(add_row, ADD_GOVERNANCE)
    out[DB_GOVERNANCE_SOURCE] = _get(add_row, ADD_GOVERNANCE_SOURCE)

    out[DB_PREVIOUS_GOVERNANCE] = _get(add_row, ADD_PREVIOUS_GOVERNANCE)
    out[DB_PREVIOUS_GOVERNANCE_START] = _get(add_row, ADD_PREVIOUS_GOVERNANCE_START)
    out[DB_PREVIOUS_GOVERNANCE_END] = _get(add_row, ADD_PREVIOUS_GOVERNANCE_END)

    out[DB_SIZE] = _get(add_row, ADD_SIZE)
    out[DB_SIZE_SOURCE] = _get(add_row, ADD_SIZE_SOURCE)

    out[DB_SUBJECT_BROAD] = ""
    out[DB_SUBJECT] = _get(add_row, ADD_SUBJECT)

    y1, y2 = split_year_range(_get(add_row, ADD_YEAR_OPENED))
    out[DB_YEAR_OPENED_1] = y1
    out[DB_YEAR_OPENED_2] = y2
    out[DB_YEAR_OPENED_SOURCE] = _get(add_row, ADD_YEAR_OPENED_SOURCE)

    c1, c2 = split_year_range(_get(add_row, ADD_YEAR_CLOSED))
    out[DB_YEAR_CLOSED_1] = c1
    out[DB_YEAR_CLOSED_2] = c2
    out[DB_YEAR_CLOSED_SOURCE] = _get(add_row, ADD_YEAR_CLOSED_SOURCE)

    out[DB_PRIMARY_PROVENANCE_OF_DATA] = _get(add_row, ADD_PRIMARY_PROVENANCE_OF_DATA)
    out[DB_NOTES] = _get(add_row, ADD_NOTES)

    return out
