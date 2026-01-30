/**
 * Maps between database and user input sheets
 */

import { DB_SHEET } from "./config";
import { asTrimmedString, getBroadType, splitYearRange } from "./normalizers";

type DbFieldKey =
    | "ID"
    | "MUSEUM_NAME"
    | "ALTERNATIVE_NAME"
    | "WIKIDATA_ID"
    | "ADDRESS_1"
    | "ADDRESS_2"
    | "ADDRESS_3"
    | "VILLAGE_TOWN_CITY"
    | "POSTCODE"
    | "ACCREDITATION"
    | "ACCREDITATION_NUMBER"
    | "ACCREDITATION_CHANGE_DATE"
    | "GOVERNANCE_BROAD"
    | "GOVERNANCE"
    | "GOVERNANCE_SOURCE"
    | "PREVIOUS_GOVERNANCE"
    | "PREVIOUS_GOVERNANCE_START"
    | "PREVIOUS_GOVERNANCE_END"
    | "SIZE"
    | "SIZE_SOURCE"
    | "SUBJECT_BROAD"
    | "SUBJECT"
    | "YEAR_OPENED_1"
    | "YEAR_OPENED_2"
    | "YEAR_OPENED_SOURCE"
    | "YEAR_CLOSED_1"
    | "YEAR_CLOSED_2"
    | "YEAR_CLOSED_SOURCE"
    | "PRIMARY_PROVENANCE_OF_DATA"
    | "NOTES";

const DB_FIELDS: DbFieldKey[] = [
    "ID",
    "MUSEUM_NAME",
    "ALTERNATIVE_NAME",
    "WIKIDATA_ID",
    "ADDRESS_1",
    "ADDRESS_2",
    "ADDRESS_3",
    "VILLAGE_TOWN_CITY",
    "POSTCODE",
    "ACCREDITATION",
    "ACCREDITATION_NUMBER",
    "ACCREDITATION_CHANGE_DATE",
    "GOVERNANCE_BROAD",
    "GOVERNANCE",
    "GOVERNANCE_SOURCE",
    "PREVIOUS_GOVERNANCE",
    "PREVIOUS_GOVERNANCE_START",
    "PREVIOUS_GOVERNANCE_END",
    "SIZE",
    "SIZE_SOURCE",
    "SUBJECT_BROAD",
    "SUBJECT",
    "YEAR_OPENED_1",
    "YEAR_OPENED_2",
    "YEAR_OPENED_SOURCE",
    "YEAR_CLOSED_1",
    "YEAR_CLOSED_2",
    "YEAR_CLOSED_SOURCE",
    "PRIMARY_PROVENANCE_OF_DATA",
    "NOTES",
];

/**
 * Writes a Database row derived from a form row (e.g. Add or Edit sheet).
 *
 * The caller is responsible for:
 * - determining the target DB row number
 * - providing the correct museum ID
 * - acquiring any required document lock
 *
 * Behaviour:
 * - Reads the existing DB row if present (to preserve DB-only columns)
 * - Overwrites fields derived from the form row (after normalizing them)
 * - Writes exactly one full-width DB row
 *
 * @param args.dbSheet     Database sheet
 * @param args.formSheet   Column mapping for the form sheet (ADD_SHEET or EDIT_SHEET)
 * @param args.rowValues   Raw values from the form row
 * @param args.dbRowNumber 1-indexed target row in the DB
 * @param args.museumId    Museum identifier to write
 */
export function insertFormToDB(args: {
    dbSheet: GoogleAppsScript.Spreadsheet.Sheet;
    formSheet: Record<string, number | string>;
    rowValues: unknown[];
    dbRowNumber: number; // 1-indexed
    museumId: string;
}): void {
    const { dbSheet, formSheet, rowValues, dbRowNumber, museumId } = args;
    const dbLastCol = dbSheet.getLastColumn();
    // If overwriting an existing row, we want to preserve DB-only columns.
    // If writing a brand new row (append), there may be nothing to read yet.
    const maybe2d = dbSheet.getRange(dbRowNumber, 1, 1, dbLastCol).getValues();
    const existing =
	Array.isArray(maybe2d) && Array.isArray(maybe2d[0]) && maybe2d[0].length > 0
	? maybe2d[0]
	: new Array(dbLastCol).fill("");
    const outRow: unknown[] = existing.slice();
    outRow[DB_SHEET.ID] = museumId;
    outRow[DB_SHEET.MUSEUM_NAME] = asTrimmedString(rowValues[formSheet.MUSEUM_NAME]);
    outRow[DB_SHEET.ALTERNATIVE_NAME] = asTrimmedString(rowValues[formSheet.ALTERNATIVE_NAME]);
    outRow[DB_SHEET.WIKIDATA_ID] = asTrimmedString(rowValues[formSheet.WIKIDATA_ID]);
    outRow[DB_SHEET.ADDRESS_1] = asTrimmedString(rowValues[formSheet.ADDRESS_1]);
    outRow[DB_SHEET.ADDRESS_2] = asTrimmedString(rowValues[formSheet.ADDRESS_2]);
    outRow[DB_SHEET.ADDRESS_3] = asTrimmedString(rowValues[formSheet.ADDRESS_3]);
    outRow[DB_SHEET.VILLAGE_TOWN_CITY] = asTrimmedString(rowValues[formSheet.VILLAGE_TOWN_CITY]);
    outRow[DB_SHEET.POSTCODE] = asTrimmedString(rowValues[formSheet.POSTCODE]).toUpperCase();
    outRow[DB_SHEET.ACCREDITATION] = asTrimmedString(rowValues[formSheet.ACCREDITATION]);
    outRow[DB_SHEET.ACCREDITATION_NUMBER] = rowValues[formSheet.ACCREDITATION_NUMBER];
    outRow[DB_SHEET.ACCREDITATION_CHANGE_DATE] = asTrimmedString(
	rowValues[formSheet.ACCREDITATION_CHANGE_DATE]
    );
    outRow[DB_SHEET.GOVERNANCE] = asTrimmedString(rowValues[formSheet.GOVERNANCE]);
    outRow[DB_SHEET.GOVERNANCE_BROAD] = getBroadType(rowValues[formSheet.GOVERNANCE]);
    outRow[DB_SHEET.GOVERNANCE_SOURCE] = asTrimmedString(rowValues[formSheet.GOVERNANCE_SOURCE]);
    outRow[DB_SHEET.PREVIOUS_GOVERNANCE] = asTrimmedString(rowValues[formSheet.PREVIOUS_GOVERNANCE]);
    outRow[DB_SHEET.PREVIOUS_GOVERNANCE_START] = asTrimmedString(
	rowValues[formSheet.PREVIOUS_GOVERNANCE_START]
    );
    outRow[DB_SHEET.PREVIOUS_GOVERNANCE_END] = asTrimmedString(
	rowValues[formSheet.PREVIOUS_GOVERNANCE_END]
    );
    outRow[DB_SHEET.SIZE] = asTrimmedString(rowValues[formSheet.SIZE]);
    outRow[DB_SHEET.SIZE_SOURCE] = asTrimmedString(rowValues[formSheet.SIZE_SOURCE]);
    outRow[DB_SHEET.SUBJECT] = asTrimmedString(rowValues[formSheet.SUBJECT]);
    outRow[DB_SHEET.SUBJECT_BROAD] = getBroadType(rowValues[formSheet.SUBJECT]);
    const [opened1, opened2] = splitYearRange(rowValues[formSheet.YEAR_OPENED]);
    outRow[DB_SHEET.YEAR_OPENED_1] = opened1;
    outRow[DB_SHEET.YEAR_OPENED_2] = opened2;
    outRow[DB_SHEET.YEAR_OPENED_SOURCE] = asTrimmedString(rowValues[formSheet.YEAR_OPENED_SOURCE]);
    const [closed1, closed2] = splitYearRange(rowValues[formSheet.YEAR_CLOSED]);
    outRow[DB_SHEET.YEAR_CLOSED_1] = closed1;
    outRow[DB_SHEET.YEAR_CLOSED_2] = closed2;
    outRow[DB_SHEET.YEAR_CLOSED_SOURCE] = asTrimmedString(rowValues[formSheet.YEAR_CLOSED_SOURCE]);
    outRow[DB_SHEET.PRIMARY_PROVENANCE_OF_DATA] = asTrimmedString(
	rowValues[formSheet.PRIMARY_PROVENANCE_OF_DATA]
    );
    outRow[DB_SHEET.NOTES] = asTrimmedString(rowValues[formSheet.NOTES]);
    dbSheet.getRange(dbRowNumber, 1, 1, dbLastCol).setValues([outRow]);
}

/**
 * Copies all DB fields from a source row into a destination row.
 *
 * Behaviour:
 * - Writes a FULL fresh row (starts from blanks), so any destination-only columns
 *   not in DbFieldKey are cleared.
 * - Does not set any non-DB fields (e.g. Trash flags, display columns).
 *
 * Callers decide:
 * - whether to append (destRowNumber = lastRow + 1) or overwrite
 * - whether to lock
 */
export function insertDatabaseToDatabase(args: {
    destSheet: GoogleAppsScript.Spreadsheet.Sheet;
    destRowNumber: number; // 1-indexed
    destMapping: Record<DbFieldKey, number>;
    sourceRowValues: unknown[];
    sourceMapping: Record<DbFieldKey, number>;
}): void {
    const { destSheet, destRowNumber, destMapping, sourceRowValues, sourceMapping } = args;
    const destLastCol = destSheet.getLastColumn();
    const outRow: unknown[] = new Array(destLastCol).fill("");
    for (const key of DB_FIELDS) {
	outRow[destMapping[key]] = sourceRowValues[sourceMapping[key]];
    }
    destSheet.getRange(destRowNumber, 1, 1, destLastCol).setValues([outRow]);
}
