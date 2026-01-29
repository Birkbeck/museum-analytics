import {
    DB_SHEET,
    ADD_SHEET,
} from "./config";
import {
    formatErrors
} from "./format-errors";
import {
    asTrimmedString,
    getBroadType,
    splitYearRange
} from "./normalizers";
import {
    validateRow
} from "./validators";

export function addMuseums(): void {
    const ss = SpreadsheetApp.getActive();
    const addSheet = ss.getSheetByName(ADD_SHEET.NAME);
    if (!addSheet) {
	throw new Error(`Missing sheet: ${ADD_SHEET.NAME}`);
    }
    const lastRow = addSheet.getLastRow();
    const lastCol = addSheet.getLastColumn();
    if (lastRow <= ADD_SHEET.HEADER_ROW + 1) {
	SpreadsheetApp.getUi().alert("No rows to add.");
	return;
    }
    const numRows = lastRow - (ADD_SHEET.HEADER_ROW + 1);
    // add 1 to header row to account for 1-indexing
    // add 1 to header row to exclude header from returned range
    const range = addSheet.getRange(ADD_SHEET.HEADER_ROW + 2, 1, numRows, lastCol);
    const values = range.getValues();
    const errorsByRow = [];
    let addedCount = 0;
    for (let i = values.length - 1; i >= 0; i--) {
	const rowValues = values[i];
	const sheetRowNumber = ADD_SHEET.HEADER_ROW + 1 + i + 1;
	const ready = rowValues[ADD_SHEET.READY_TO_COMMIT] === true;
	if (!ready) {
	    continue;
	}
	const errs = validateRow(rowValues, ADD_SHEET);
	if (errs.length > 0) {
	    errorsByRow.push({ row: sheetRowNumber, errors: errs });
	} else {
	    addRow(ss, rowValues)
	    deleteRow(ss, sheetRowNumber);
	    addedCount++;
	}
    }
    if (errorsByRow.length > 0) {
	const msg = formatErrors(errorsByRow, addedCount);
	SpreadsheetApp.getUi().alert(msg);
    } else {
	const msg = addedCount === 1
	    ? `Added ${addedCount} museum to Database.`
	    : `Added ${addedCount} museums to Database.`
	SpreadsheetApp.getUi().alert(msg);
    }
}

function addRow(ss: GoogleAppsScript.Spreadsheet.Spreadsheet, rowValues: unknown[]): void {
    const dbSheet = ss.getSheetByName(DB_SHEET.NAME);
    if (!dbSheet) throw new Error(`Missing sheet: ${DB_SHEET.NAME}`);
    withDocumentLock(() => {
	const dbLastCol = dbSheet.getLastColumn();
	const newRowIndex = dbSheet.getLastRow() + 1;
	const outRow: unknown[] = new Array(dbLastCol).fill("");
	outRow[DB_SHEET.ID] = nextMuseumId(dbSheet);
	// Copy fields (0-indexed constants)
	outRow[DB_SHEET.MUSEUM_NAME] = asTrimmedString(
	    rowValues[ADD_SHEET.MUSEUM_NAME]);
	outRow[DB_SHEET.ALTERNATIVE_NAME] = asTrimmedString(rowValues[ADD_SHEET.ALTERNATIVE_NAME]);
	outRow[DB_SHEET.WIKIDATA_ID] = asTrimmedString(rowValues[ADD_SHEET.WIKIDATA_ID]);
	outRow[DB_SHEET.ADDRESS_1] = asTrimmedString(rowValues[ADD_SHEET.ADDRESS_1]);
	outRow[DB_SHEET.ADDRESS_2] = asTrimmedString(rowValues[ADD_SHEET.ADDRESS_2]);
	outRow[DB_SHEET.ADDRESS_3] = asTrimmedString(rowValues[ADD_SHEET.ADDRESS_3]);
	outRow[DB_SHEET.VILLAGE_TOWN_CITY] = asTrimmedString(rowValues[ADD_SHEET.VILLAGE_TOWN_CITY]);
	outRow[DB_SHEET.POSTCODE]  = asTrimmedString(rowValues[ADD_SHEET.POSTCODE]).toUpperCase();
	outRow[DB_SHEET.ACCREDITATION] = asTrimmedString(rowValues[ADD_SHEET.ACCREDITATION]);
	outRow[DB_SHEET.ACCREDITATION_NUMBER] = rowValues[ADD_SHEET.ACCREDITATION_NUMBER];
	outRow[DB_SHEET.ACCREDITATION_CHANGE_DATE] = asTrimmedString(
	    rowValues[ADD_SHEET.ACCREDITATION_CHANGE_DATE]
	);
	outRow[DB_SHEET.GOVERNANCE_BROAD] = getBroadType(rowValues[ADD_SHEET.GOVERNANCE]);
	outRow[DB_SHEET.GOVERNANCE] = asTrimmedString(rowValues[ADD_SHEET.GOVERNANCE]);
	outRow[DB_SHEET.GOVERNANCE_SOURCE] = asTrimmedString(rowValues[ADD_SHEET.GOVERNANCE_SOURCE]);
	outRow[DB_SHEET.PREVIOUS_GOVERNANCE] = asTrimmedString(rowValues[ADD_SHEET.PREVIOUS_GOVERNANCE]);
	outRow[DB_SHEET.PREVIOUS_GOVERNANCE_START] = asTrimmedString(
	    rowValues[ADD_SHEET.PREVIOUS_GOVERNANCE_START]
	);
	outRow[DB_SHEET.PREVIOUS_GOVERNANCE_END] = asTrimmedString(
	    rowValues[ADD_SHEET.PREVIOUS_GOVERNANCE_END]
	);
	outRow[DB_SHEET.SIZE] = asTrimmedString(rowValues[ADD_SHEET.SIZE]);
	outRow[DB_SHEET.SIZE_SOURCE] = asTrimmedString(rowValues[ADD_SHEET.SIZE_SOURCE]);
	outRow[DB_SHEET.SUBJECT_BROAD] = getBroadType(rowValues[ADD_SHEET.SUBJECT]);
	outRow[DB_SHEET.SUBJECT] = asTrimmedString(rowValues[ADD_SHEET.SUBJECT]);
	const [opened1, opened2] = splitYearRange(rowValues[ADD_SHEET.YEAR_OPENED]);
	outRow[DB_SHEET.YEAR_OPENED_1] = opened1;
	outRow[DB_SHEET.YEAR_OPENED_2] = opened2;
	outRow[DB_SHEET.YEAR_OPENED_SOURCE] = asTrimmedString(rowValues[ADD_SHEET.YEAR_OPENED_SOURCE]);
	const [closed1, closed2] = splitYearRange(rowValues[ADD_SHEET.YEAR_CLOSED]);
	outRow[DB_SHEET.YEAR_CLOSED_1] = closed1;
	outRow[DB_SHEET.YEAR_CLOSED_2] = closed2;
	outRow[DB_SHEET.YEAR_CLOSED_SOURCE] = asTrimmedString(rowValues[ADD_SHEET.YEAR_CLOSED_SOURCE]);
	outRow[DB_SHEET.PRIMARY_PROVENANCE_OF_DATA] = asTrimmedString(
	    rowValues[ADD_SHEET.PRIMARY_PROVENANCE_OF_DATA]
	);
	outRow[DB_SHEET.NOTES] = asTrimmedString(rowValues[ADD_SHEET.NOTES]);
	dbSheet.getRange(newRowIndex, 1, 1, dbLastCol).setValues([outRow]);
    });
}

function deleteRow(ss, sheetRowNumber: number): void {
    const addSheet = ss.getSheetByName(ADD_SHEET.NAME);
    if (!addSheet) {
	throw new Error(`Missing sheet: ${ADD_SHEET.NAME}`);
    }
    addSheet.deleteRow(sheetRowNumber);
}

function withDocumentLock<T>(fn: () => T): T {
    const lock = LockService.getDocumentLock();
    lock.waitLock(30_000);
    try {
	return fn();
    } finally {
	lock.releaseLock();
    }
}

function nextMuseumId(dbSheet: GoogleAppsScript.Spreadsheet.Sheet): string {
    return withDocumentLock(() => {
	const lastRow1 = dbSheet.getLastRow();
	const headerRow1 = DB_SHEET.HEADER_ROW + 1;
	if (lastRow1 <= headerRow1) {
	    return "mm.new.1";
	}
	const numDataRows = lastRow1 - headerRow1;
	const idValues = dbSheet
	    .getRange(headerRow1 + 1, DB_SHEET.ID + 1, numDataRows, 1)
	    .getValues();
	let max = 0;
	const re = /^mm\.new\.(\d+)$/;
	for (const [cell] of idValues) {
	    const s = typeof cell === "string" ? cell.trim() : String(cell ?? "").trim();
	    const m = re.exec(s);
	    if (!m) continue;
	    const n = Number(m[1]);
	    if (Number.isFinite(n) && n > max) max = n;
	}
	return `mm.new.${max + 1}`;
    });
}
