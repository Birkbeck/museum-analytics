import { DB_SHEET, TRASH_SHEET } from "./config";
import { formatErrors } from "./format-errors";
import { asTrimmedString } from "./normalizers";
import { withDocumentLock } from "./lock";
import { insertDatabaseToDatabase } from "./insert";

type RowError = { row: number; errors: string[] };

type SheetRowValues = unknown[];

type ReadyRow = {
    sheetRowNumber: number; // 1-indexed row number on Trash sheet
    rowValues: SheetRowValues;
};

type RestoreAction = {
    sheetRowNumber: number; // 1-indexed row number on Trash sheet
    museumId: string;
    rowValues: SheetRowValues;
};

type ErrorsAndActions = {
    errorsByRow: RowError[];
    actions: RestoreAction[];
};

/**
 * Restores rows from the Trash sheet back into the Database.
 *
 * Behaviour:
 * - Only rows with TRASH_SHEET.RESTORE === true are processed
 * - Copies exact DB fields from Trash into a new row appended to the Database
 * - Deletes restored rows from the Trash sheet
 * - Leaves invalid rows untouched and reports errors
 *
 * Side effects:
 * - Writes rows to the Database sheet
 * - Deletes rows from the Trash sheet
 * - Displays UI alerts
 */
export function restoreMuseums(): void {
    const ss = SpreadsheetApp.getActive();
    const trashSheet = ss.getSheetByName(TRASH_SHEET.NAME);
    if (!trashSheet) {
	throw new Error(`Missing sheet: ${TRASH_SHEET.NAME}`);
    }
    const lastRow = trashSheet.getLastRow();
    const lastCol = trashSheet.getLastColumn();
    if (lastRow <= TRASH_SHEET.HEADER_ROW + 1) {
	SpreadsheetApp.getUi().alert("No restores to commit.");
	return;
    }
    const numRows = lastRow - (TRASH_SHEET.HEADER_ROW + 1);
    const range = trashSheet.getRange(TRASH_SHEET.HEADER_ROW + 2, 1, numRows, lastCol);
    const rows = range.getValues() as unknown[][];
    const readyRows = getReadyToRestoreRows(rows);
    if (readyRows.length === 0) {
	SpreadsheetApp.getUi().alert("No rows marked ready to restore.");
	return;
    }
    const { errorsByRow, actions } = getErrorsAndActions(readyRows);
    if (actions.length === 0) {
	SpreadsheetApp.getUi().alert(formatErrors(errorsByRow, 0));
	return;
    }
    let restoredCount = 0;
    withDocumentLock(() => {
	const dbSheet = ss.getSheetByName(DB_SHEET.NAME);
	if (!dbSheet) {
	    throw new Error(`Missing sheet: ${DB_SHEET.NAME}`);
	}
	const idToDbRow = buildDbIdRowMap(dbSheet);
	// Ensure deletes happen bottom-up on Trash sheet
	actions.sort((a, b) => b.sheetRowNumber - a.sheetRowNumber);
	let nextDbRowNumber = dbSheet.getLastRow() + 1;
	for (const a of actions) {
	    if (idToDbRow.has(a.museumId)) {
		errorsByRow.push({
		    row: a.sheetRowNumber,
		    errors: [`Museum ID "${a.museumId}" already exists in ${DB_SHEET.NAME}.`],
		});
		continue;
	    }
	    insertDatabaseToDatabase({
		destSheet: dbSheet,
		destRowNumber: nextDbRowNumber,
		destMapping: DB_SHEET,
		sourceRowValues: a.rowValues,
		sourceMapping: TRASH_SHEET,
	    });
	    idToDbRow.set(a.museumId, nextDbRowNumber);
	    trashSheet.deleteRow(a.sheetRowNumber);
	    restoredCount++;
	    nextDbRowNumber++;
	}
    });
    if (errorsByRow.length > 0) {
	SpreadsheetApp.getUi().alert(formatErrors(errorsByRow, restoredCount));
    } else {
	SpreadsheetApp.getUi().alert(
	    restoredCount === 1
		? `Restored ${restoredCount} museum to Database.`
		: `Restored ${restoredCount} museums to Database.`
	);
    }
}

function getReadyToRestoreRows(rows: unknown[][]): ReadyRow[] {
    const readyRows: ReadyRow[] = [];
    // iterate bottom-up so deletes are safe later
    for (let i = rows.length - 1; i >= 0; i--) {
	const rowValues = rows[i] as SheetRowValues;
	const sheetRowNumber = TRASH_SHEET.HEADER_ROW + 1 + i + 1;
	const ready = rowValues[TRASH_SHEET.RESTORE] === true;
	if (!ready) continue;
	readyRows.push({ sheetRowNumber, rowValues });
    }
    return readyRows;
}

function getErrorsAndActions(readyRows: ReadyRow[]): ErrorsAndActions {
    const errorsByRow: RowError[] = [];
    const actions: RestoreAction[] = [];
    for (const { sheetRowNumber, rowValues } of readyRows) {
	const errs: string[] = [];
	const museumId = asTrimmedString(rowValues[TRASH_SHEET.ID]);
	if (!museumId) {
	    errs.push("Trash row is missing a Museum ID.");
	}
	if (errs.length > 0) {
	    errorsByRow.push({ row: sheetRowNumber, errors: errs });
	    continue;
	}
	actions.push({ sheetRowNumber, museumId, rowValues });
    }
    return { errorsByRow, actions };
}

function buildDbIdRowMap(dbSheet: GoogleAppsScript.Spreadsheet.Sheet): Map<string, number> {
    const map = new Map<string, number>();
    const lastRow1 = dbSheet.getLastRow();
    const headerRow1 = DB_SHEET.HEADER_ROW + 1;
    if (lastRow1 <= headerRow1) {
	return map;
    }
    const numDataRows = lastRow1 - headerRow1;
    const idColIndex = DB_SHEET.ID + 1;
    const idValues = dbSheet.getRange(headerRow1 + 1, idColIndex, numDataRows, 1).getValues();
    for (let i = 0; i < idValues.length; i++) {
	const id = asTrimmedString(idValues[i][0]);
	if (!id) continue;
	const sheetRowNumber = headerRow1 + 1 + i;
	map.set(id, sheetRowNumber);
    }
    return map;
}
