import pytest

from mm_db_cloud.utils.validators import (
    validate_row,
    is_empty,
    is_not_empty,
    is_valid_wikidata_id,
    is_valid_postcode,
    is_valid_accreditation,
    is_valid_accreditation_number,
    is_valid_year_range,
    is_valid_governance,
    is_valid_size,
    is_valid_subject,
)

# Optional: if you want to assert membership behavior is strict
from mm_db_cloud.config.allowed_values import (
    ACCREDITATION_VALUES,
    GOVERNANCE_VALUES,
    SIZE_VALUES,
    SUBJECT_VALUES,
)


def test_is_empty_and_is_not_empty():
    assert is_empty(None) is True
    assert is_empty("") is True
    assert is_empty("   ") is True
    assert is_empty("x") is False
    assert is_not_empty("x") is True
    assert is_not_empty("   ") is False


@pytest.mark.parametrize(
    "value,expected",
    [
        ("Q1", True),
        ("Q56", True),
        ("Q0001", True),
        ("q56", False),  # TS regex is case-sensitive (^Q\\d+$)
        ("Q", False),
        ("QABC", False),
        ("", False),
        (None, False),
        (123, False),
    ],
)
def test_is_valid_wikidata_id(value, expected):
    assert is_valid_wikidata_id(value) is expected


@pytest.mark.parametrize(
    "value,expected",
    [
        ("WC1E 7HZ", True),
        ("SW1A 1AA", True),
        ("sw1a 1aa", True),  # regex is case-insensitive
        ("WC1E7HZ", False),  # missing space
        ("", False),
        (None, False),
        (123, False),
    ],
)
def test_is_valid_postcode(value, expected):
    assert is_valid_postcode(value) is expected


def test_is_valid_accreditation_strict_membership():
    # sanity checks on config
    assert "accredited" in ACCREDITATION_VALUES
    assert "unaccredited" in ACCREDITATION_VALUES

    assert is_valid_accreditation("accredited") is True
    assert is_valid_accreditation("unaccredited") is True
    assert is_valid_accreditation("Accredited") is False  # membership is exact
    assert is_valid_accreditation("") is False
    assert is_valid_accreditation(None) is False


@pytest.mark.parametrize(
    "value,expected",
    [
        (1, True),
        ("1", True),
        ("42", True),
        (0, False),
        ("0", False),
        (-1, False),
        ("-2", False),
        ("abc", False),
        ("", False),
        (None, False),
        (True, False),  # avoid treating bool as int
    ],
)
def test_is_valid_accreditation_number(value, expected):
    assert is_valid_accreditation_number(value) is expected


@pytest.mark.parametrize(
    "value,expected",
    [
        ("1999", True),
        ("0000", True),
        ("1999/1999", True),
        ("1999/2000", True),
        ("2000/1999", False),  # start > end
        ("199", False),
        ("1999/200", False),
        ("1999/", False),
        ("/1999", False),
        ("", False),  # IMPORTANT: empty is invalid (matches your TS)
        ("   ", False),
        (None, False),
        (1999, True),  # TS accepts number by String(value)
        (1999.5, False),  # "1999.5" won't match regex
    ],
)
def test_is_valid_year_range(value, expected):
    assert is_valid_year_range(value) is expected


def test_is_valid_governance_strict():
    sample = next(iter(GOVERNANCE_VALUES))
    assert is_valid_governance(sample) is True
    assert is_valid_governance("not-a-governance") is False
    assert is_valid_governance("") is False
    assert is_valid_governance(None) is False


def test_is_valid_size_strict():
    sample = next(iter(SIZE_VALUES))
    assert is_valid_size(sample) is True
    assert is_valid_size("not-a-size") is False
    assert is_valid_size("") is False
    assert is_valid_size(None) is False


def test_is_valid_subject_strict():
    sample = next(iter(SUBJECT_VALUES))
    assert is_valid_subject(sample) is True
    assert is_valid_subject("not-a-subject") is False
    assert is_valid_subject("") is False
    assert is_valid_subject(None) is False


def _columns_for_add_sheet():
    # Minimal mapping used by validate_row, mirroring your TS validator expectations
    return {
        "MUSEUM_NAME": 1,
        "WIKIDATA_ID": 3,
        "POSTCODE": 8,
        "ACCREDITATION": 9,
        "ACCREDITATION_NUMBER": 10,
        "ACCREDITATION_CHANGE_DATE": 11,
        "GOVERNANCE": 12,
        "PREVIOUS_GOVERNANCE": 14,
        "PREVIOUS_GOVERNANCE_START": 15,
        "PREVIOUS_GOVERNANCE_END": 16,
        "SIZE": 17,
        "SUBJECT": 19,
        "YEAR_OPENED": 20,
        "YEAR_CLOSED": 22,
    }


def _base_valid_add_row():
    # Build a list long enough for the highest index used above (22)
    row = [""] * 23
    row[1] = "Museum of Stuff"
    row[3] = "Q56"
    row[8] = "WC1E 7HZ"
    row[9] = "accredited"
    row[10] = ""  # optional
    row[11] = ""  # optional
    row[12] = next(iter(GOVERNANCE_VALUES))
    row[14] = ""  # optional
    row[15] = ""  # optional
    row[16] = ""  # optional
    row[17] = next(iter(SIZE_VALUES))
    row[19] = next(iter(SUBJECT_VALUES))
    row[20] = "1999"
    row[22] = "2000"
    return row


def test_validate_row_valid_row_has_no_errors():
    cols = _columns_for_add_sheet()
    row = _base_valid_add_row()
    errs = validate_row(row, cols)
    assert errs == []


def test_validate_row_requires_name():
    cols = _columns_for_add_sheet()
    row = _base_valid_add_row()
    row[1] = "   "
    errs = validate_row(row, cols)
    assert "Museum must have a name." in errs


def test_validate_row_invalid_wikidata():
    cols = _columns_for_add_sheet()
    row = _base_valid_add_row()
    row[3] = "BAD"
    errs = validate_row(row, cols)
    assert any("Wikidata ID" in e and "not a valid Wikidata ID" in e for e in errs)


def test_validate_row_invalid_postcode():
    cols = _columns_for_add_sheet()
    row = _base_valid_add_row()
    row[8] = "NOT A POSTCODE"
    errs = validate_row(row, cols)
    assert any(
        "Postcode" in e and "not a correctly formatted UK postcode" in e for e in errs
    )


def test_validate_row_invalid_accreditation():
    cols = _columns_for_add_sheet()
    row = _base_valid_add_row()
    row[9] = "nope"
    errs = validate_row(row, cols)
    assert any(
        "Accreditation" in e and "not a valid accreditation status" in e for e in errs
    )


def test_validate_row_accreditation_number_optional_but_if_present_must_be_valid():
    cols = _columns_for_add_sheet()
    row = _base_valid_add_row()

    row[10] = ""  # optional => ok
    assert validate_row(row, cols) == []

    row[10] = "abc"  # present but invalid => error
    errs = validate_row(row, cols)
    assert any(
        "Accreditation number" in e and "not a valid accreditation number" in e
        for e in errs
    )


def test_validate_row_year_opened_and_closed_cannot_be_empty():
    cols = _columns_for_add_sheet()
    row = _base_valid_add_row()

    row[20] = ""  # YEAR_OPENED
    errs = validate_row(row, cols)
    assert any("Year opened" in e and "not a valid year range" in e for e in errs)

    row = _base_valid_add_row()
    row[22] = ""  # YEAR_CLOSED
    errs = validate_row(row, cols)
    assert any("Year closed" in e and "not a valid year range" in e for e in errs)
