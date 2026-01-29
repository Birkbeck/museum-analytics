import {
    DB_SHEET,
    EDIT_SHEET
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

type RowError = { row: number; errors: string[] };

type SheetRowValues = unknown[];

type ReadyRow = {
    sheetRowNumber: number; // 1-indexed sheet row number
    rowValues: SheetRowValues;
};

type EditAction = {
    sheetRowNumber: number; // 1-indexed sheet row number (on Edit sheet)
    museumId: string;
    rowValues: SheetRowValues;
};

type ErrorsAndActions = {
    errorsByRow: RowError[];
    actions: EditAction[];
};

export function editMuseums(): void {
    const ss = SpreadsheetApp.getActive();
    const editSheet = ss.getSheetByName(EDIT_SHEET.NAME);
    if (!editSheet) {
	throw new Error(`Missing sheet: ${EDIT_SHEET.NAME}`);
    }
    const lastRow = editSheet.getLastRow();
    const lastCol = editSheet.getLastColumn();
    if (lastRow <= EDIT_SHEET.HEADER_ROW + 1) {
	SpreadsheetApp.getUi().alert("No edits to commit.");
	return;
    }
    const numRows = lastRow - (EDIT_SHEET.HEADER_ROW + 1);
    // add 1 to header row to account for 1-indexing
    // add 1 to header row to exclude header from returned range
    const range = editSheet.getRange(EDIT_SHEET.HEADER_ROW + 2, 1, numRows, lastCol);
    const rows = range.getValues() as unknown[][];
    const readyRows = getReadyToCommitRows(rows);
    if (readyRows.length === 0) {
	SpreadsheetApp.getUi().alert("No rows marked ready to commit.");
	return;
    }
    const { errorsByRow, actions } = getErrorsAndActions(readyRows);
    if (actions.length === 0) {
	SpreadsheetApp.getUi().alert(formatErrors(errorsByRow, 0));
	return;
    }
    let editedCount = 0;
    withDocumentLock(() => {
	const dbSheet = ss.getSheetByName(DB_SHEET.NAME);
	if (!dbSheet) {
	    throw new Error(`Missing sheet: ${DB_SHEET.NAME}`);
	}
	const idToRow = buildDbIdRowMap(dbSheet);
	// Ensure deletes happen bottom-up on the Edit sheet
	actions.sort((a, b) => b.sheetRowNumber - a.sheetRowNumber);
	for (const a of actions) {
	    const dbRowNumber = idToRow.get(a.museumId);
	    if (!dbRowNumber) {
		errorsByRow.push({
		    row: a.sheetRowNumber,
		    errors: [`Museum ID "${a.museumId}" not found in ${DB_SHEET.NAME}.`],
		});
		continue;
	    }
	    updateDbRow(dbSheet, dbRowNumber, a.rowValues);
	    deleteEditRow(editSheet, a.sheetRowNumber);
	    editedCount++;
	}
    });
    if (errorsByRow.length > 0) {
	SpreadsheetApp.getUi().alert(formatErrors(errorsByRow, editedCount));
    } else {
	SpreadsheetApp.getUi().alert(
	    editedCount === 1
		? `Edited ${editedCount} museum in Database.`
		: `Edited ${editedCount} museums in Database.`
	);
    }
}

function getReadyToCommitRows(rows: unknown[][]): ReadyRow[] {
    const readyRows: ReadyRow[] = [];
    // iterate bottom-up so deletes are safe later
    for (let i = rows.length - 1; i >= 0; i--) {
	const rowValues = rows[i] as SheetRowValues;
	// header row is 0-indexed in config; sheet is 1-indexed
	const sheetRowNumber = EDIT_SHEET.HEADER_ROW + 1 + i + 1;
	const ready = rowValues[EDIT_SHEET.READY_TO_COMMIT] === true;
	if (!ready) {
	    continue;
	}
	readyRows.push({ sheetRowNumber, rowValues });
    }
    return readyRows;
}

function getErrorsAndActions(readyRows: ReadyRow[]): ErrorsAndActions {
    const errorsByRow: RowError[] = [];
    const actions: EditAction[] = [];
    for (const { sheetRowNumber, rowValues } of readyRows) {
	const errors: string[] = [];
	const museumCell = rowValues[EDIT_SHEET.MUSEUM];
	const museumId = parseMuseumId(museumCell);
	if (!museumId) {
	    errors.push(
		`Museum "${asTrimmedString(museumCell)}" is not valid. Expected "id - name".`
	    );
	}
	errors.push(...validateRow(rowValues, EDIT_SHEET));
	if (errors.length > 0) {
	    errorsByRow.push({ row: sheetRowNumber, errors: errors });
	    continue;
	}
	actions.push({ sheetRowNumber, museumId: museumId!, rowValues });
    }
    return { errorsByRow, actions };
}

function parseMuseumId(value: unknown): string | null {
    if (typeof value !== "string") {
	return null;
    }
    const s = value.trim();
    if (!s) {
	return null;
    }
    const m = /^(.+?)\s*-\s*.+$/.exec(s);
    if (!m) {
	return null;
    }
    const id = m[1].trim();
    return id ? id : null;
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

function buildDbIdRowMap(
    dbSheet: GoogleAppsScript.Spreadsheet.Sheet
): Map<string, number> {
    const map = new Map<string, number>();
    const lastRow1 = dbSheet.getLastRow();
    const headerRow1 = DB_SHEET.HEADER_ROW + 1;
    if (lastRow1 <= headerRow1) {
	return map;
    }
    const numDataRows = lastRow1 - headerRow1;
    const idColIndex = DB_SHEET.ID + 1;
    const idValues = dbSheet
	.getRange(headerRow1 + 1, idColIndex, numDataRows, 1)
	.getValues();
    for (let i = 0; i < idValues.length; i++) {
	const id = asTrimmedString(idValues[i][0]);
	if (!id) {
	    continue;
	}
	const sheetRowNumber = headerRow1 + 1 + i;
	map.set(id, sheetRowNumber);
    }
    return map;
}

function updateDbRow(
    dbSheet: GoogleAppsScript.Spreadsheet.Sheet,
    dbRowNumber: number,
    editRowValues: unknown[]
): void {
    const dbLastCol = dbSheet.getLastColumn();
    const existing = dbSheet.getRange(dbRowNumber, 1, 1, dbLastCol).getValues()[0];
    // copy existing to output row
    const outRow = existing.slice();
    outRow[DB_SHEET.MUSEUM_NAME] = asTrimmedString(editRowValues[EDIT_SHEET.MUSEUM_NAME]);
    outRow[DB_SHEET.ALTERNATIVE_NAME] = asTrimmedString(editRowValues[EDIT_SHEET.ALTERNATIVE_NAME]);
    outRow[DB_SHEET.WIKIDATA_ID] = asTrimmedString(editRowValues[EDIT_SHEET.WIKIDATA_ID]);
    outRow[DB_SHEET.ADDRESS_1] = asTrimmedString(editRowValues[EDIT_SHEET.ADDRESS_1]);
    outRow[DB_SHEET.ADDRESS_2] = asTrimmedString(editRowValues[EDIT_SHEET.ADDRESS_2]);
    outRow[DB_SHEET.ADDRESS_3] = asTrimmedString(editRowValues[EDIT_SHEET.ADDRESS_3]);
    outRow[DB_SHEET.VILLAGE_TOWN_CITY] = asTrimmedString(
	editRowValues[EDIT_SHEET.VILLAGE_TOWN_CITY]
    );
    outRow[DB_SHEET.POSTCODE] = asTrimmedString(editRowValues[EDIT_SHEET.POSTCODE]).toUpperCase();
    outRow[DB_SHEET.ACCREDITATION] = asTrimmedString(editRowValues[EDIT_SHEET.ACCREDITATION]);
    outRow[DB_SHEET.ACCREDITATION_NUMBER] = editRowValues[EDIT_SHEET.ACCREDITATION_NUMBER];
    outRow[DB_SHEET.ACCREDITATION_CHANGE_DATE] = asTrimmedString(
	editRowValues[EDIT_SHEET.ACCREDITATION_CHANGE_DATE]
    );
    outRow[DB_SHEET.GOVERNANCE_BROAD] = getBroadType(editRowValues[EDIT_SHEET.GOVERNANCE]);
    outRow[DB_SHEET.GOVERNANCE] = asTrimmedString(editRowValues[EDIT_SHEET.GOVERNANCE]);
    outRow[DB_SHEET.GOVERNANCE_SOURCE] = asTrimmedString(
	editRowValues[EDIT_SHEET.GOVERNANCE_SOURCE]
    );
    outRow[DB_SHEET.PREVIOUS_GOVERNANCE] = asTrimmedString(
	editRowValues[EDIT_SHEET.PREVIOUS_GOVERNANCE]
    );
    outRow[DB_SHEET.PREVIOUS_GOVERNANCE_START] = asTrimmedString(
	editRowValues[EDIT_SHEET.PREVIOUS_GOVERNANCE_START]
    );
    outRow[DB_SHEET.PREVIOUS_GOVERNANCE_END] = asTrimmedString(
	editRowValues[EDIT_SHEET.PREVIOUS_GOVERNANCE_END]
    );
    outRow[DB_SHEET.SIZE] = asTrimmedString(editRowValues[EDIT_SHEET.SIZE]);
    outRow[DB_SHEET.SIZE_SOURCE] = asTrimmedString(editRowValues[EDIT_SHEET.SIZE_SOURCE]);
    outRow[DB_SHEET.SUBJECT_BROAD] = getBroadType(editRowValues[EDIT_SHEET.SUBJECT]);
    outRow[DB_SHEET.SUBJECT] = asTrimmedString(editRowValues[EDIT_SHEET.SUBJECT]);
    const [opened1, opened2] = splitYearRange(editRowValues[EDIT_SHEET.YEAR_OPENED]);
    outRow[DB_SHEET.YEAR_OPENED_1] = opened1;
    outRow[DB_SHEET.YEAR_OPENED_2] = opened2;
    outRow[DB_SHEET.YEAR_OPENED_SOURCE] = asTrimmedString(
	editRowValues[EDIT_SHEET.YEAR_OPENED_SOURCE]
    );
    const [closed1, closed2] = splitYearRange(editRowValues[EDIT_SHEET.YEAR_CLOSED]);
    outRow[DB_SHEET.YEAR_CLOSED_1] = closed1;
    outRow[DB_SHEET.YEAR_CLOSED_2] = closed2;
    outRow[DB_SHEET.YEAR_CLOSED_SOURCE] = asTrimmedString(
	editRowValues[EDIT_SHEET.YEAR_CLOSED_SOURCE]
    );
    outRow[DB_SHEET.PRIMARY_PROVENANCE_OF_DATA] = asTrimmedString(
	editRowValues[EDIT_SHEET.PRIMARY_PROVENANCE_OF_DATA]
    );
    outRow[DB_SHEET.NOTES] = asTrimmedString(editRowValues[EDIT_SHEET.NOTES]);
    dbSheet.getRange(dbRowNumber, 1, 1, dbLastCol).setValues([outRow]);
}

function deleteEditRow(
    editSheet: GoogleAppsScript.Spreadsheet.Sheet,
    sheetRowNumber: number
): void {
    editSheet.deleteRow(sheetRowNumber);
}
