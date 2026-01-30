/**
 * Handles committing rows from the Add sheet into the Database.
 *
 * Responsibilities:
 * - Identify rows marked "ready to commit"
 * - Validate form data
 * - Allocate new museum IDs
 * - Insert new rows into the Database
 * - Remove committed rows from the Add sheet
 *
 * This module owns:
 * - ID generation strategy
 * - transaction boundaries (locking)
 *
 * It delegates:
 * - form → DB mapping to insertFormToDB
 * - row deletion to remove.ts
 */

import { DB_SHEET, ADD_SHEET } from "./config";
import { allocateNextMuseumId } from "./id";
import { formatErrors } from "./format-errors";
import { validateRow } from "./validators";
import { withDocumentLock } from "./lock";
import { insertFormToDB } from "./insert";
import { deleteFormRow } from "./remove";

type RowError = { row: number; errors: string[] };

type SheetRowValues = unknown[];

type ReadyRow = {
    sheetRowNumber: number; // 1-indexed row number on Add sheet
    rowValues: SheetRowValues;
};

type AddAction = {
    sheetRowNumber: number; // 1-indexed row number on Add sheet
    rowValues: SheetRowValues;
};

type ErrorsAndActions = {
    errorsByRow: RowError[];
    actions: AddAction[];
};

/**
 * Commits all valid, ready-to-commit rows from the Add sheet into the Database.
 *
 * Behaviour:
 * - Skips rows not marked ready
 * - Validates each ready row independently
 * - Inserts valid rows and deletes them from the Add sheet
 * - Leaves invalid rows untouched and reports their errors
 *
 * Side effects:
 * - Writes new rows to the Database sheet
 * - Deletes rows from the Add sheet
 * - Displays UI alerts
 */
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
    const range = addSheet.getRange(ADD_SHEET.HEADER_ROW + 2, 1, numRows, lastCol);
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
    let addedCount = 0;
    withDocumentLock(() => {
	const dbSheet = ss.getSheetByName(DB_SHEET.NAME);
	if (!dbSheet) {
	    throw new Error(`Missing sheet: ${DB_SHEET.NAME}`);
	}
	// delete bottom-up on Add sheet
	actions.sort((a, b) => b.sheetRowNumber - a.sheetRowNumber);
	for (const a of actions) {
	    const museumId = allocateNextMuseumId(ss);
	    const dbRowNumber = dbSheet.getLastRow() + 1; // append
	    insertFormToDB({
		dbSheet,
		formSheet: ADD_SHEET,
		rowValues: a.rowValues,
		dbRowNumber,
		museumId,
	    });
	    deleteFormRow({ ss, sheetName: ADD_SHEET.NAME, sheetRowNumber: a.sheetRowNumber });
	    addedCount++;
	}
    });
    if (errorsByRow.length > 0) {
	SpreadsheetApp.getUi().alert(formatErrors(errorsByRow, addedCount));
    } else {
	SpreadsheetApp.getUi().alert(
	    addedCount === 1
		? `Added ${addedCount} museum to Database.`
		: `Added ${addedCount} museums to Database.`
	);
    }
}

function getReadyToCommitRows(rows: unknown[][]): ReadyRow[] {
    const readyRows: ReadyRow[] = [];
    for (let i = rows.length - 1; i >= 0; i--) {
	const rowValues = rows[i] as SheetRowValues;
	const sheetRowNumber = ADD_SHEET.HEADER_ROW + 1 + i + 1;
	const ready = rowValues[ADD_SHEET.READY_TO_COMMIT] === true;
	if (!ready) {
	    continue;
	}
	readyRows.push({ sheetRowNumber, rowValues });
    }
    return readyRows;
}

function getErrorsAndActions(readyRows: ReadyRow[]): ErrorsAndActions {
    const errorsByRow: RowError[] = [];
    const actions: AddAction[] = [];
    for (const { sheetRowNumber, rowValues } of readyRows) {
	const errs = validateRow(rowValues, ADD_SHEET);
	if (errs.length > 0) {
	    errorsByRow.push({ row: sheetRowNumber, errors: errs });
	    continue;
	}
	actions.push({ sheetRowNumber, rowValues });
    }
    return { errorsByRow, actions };
}
