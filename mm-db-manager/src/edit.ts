/**
 * Handles committing edits from the Edit sheet into the Database.
 *
 * Responsibilities:
 * - Identify rows marked "ready to commit"
 * - Validate edited data
 * - Resolve target Database rows via museum ID
 * - Update existing Database rows
 * - Remove committed rows from the Edit sheet
 *
 * This module owns:
 * - parsing museum IDs from the Edit sheet
 * - transaction boundaries (locking)
 *
 * It delegates:
 * - form → DB mapping to insertFormToDB
 * - row deletion to remove.ts
 */

import { DB_SHEET, EDIT_SHEET } from "./config";
import { formatErrors } from "./format-errors";
import { asTrimmedString } from "./normalizers";
import { validateRow } from "./validators";
import { withDocumentLock } from "./lock";
import { insertFormToDB } from "./insert";
import { deleteFormRow } from "./remove";

type RowError = { row: number; errors: string[] };

type SheetRowValues = unknown[];

type ReadyRow = {
    sheetRowNumber: number; // 1-indexed row number on Edit sheet
    rowValues: SheetRowValues;
};

type EditAction = {
    sheetRowNumber: number; // 1-indexed row number on Edit sheet
    museumId: string;
    rowValues: SheetRowValues;
};

type ErrorsAndActions = {
    errorsByRow: RowError[];
    actions: EditAction[];
};

/**
 * Commits all valid, ready-to-commit rows from the Edit sheet into the Database.
 *
 * Behaviour:
 * - Skips rows not marked ready
 * - Validates each ready row independently
 * - Updates existing Database rows when IDs are found
 * - Leaves rows untouched if validation fails or IDs cannot be resolved
 *
 * Side effects:
 * - Updates rows in the Database sheet
 * - Deletes rows from the Edit sheet
 * - Displays UI alerts
 */
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
	if (!dbSheet) throw new Error(`Missing sheet: ${DB_SHEET.NAME}`);
	const idToRow = buildDbIdRowMap(dbSheet);
	// delete bottom-up on Edit sheet
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
	    insertFormToDB({
		dbSheet,
		formSheet: EDIT_SHEET,
		rowValues: a.rowValues,
		dbRowNumber,
		museumId: a.museumId,
	    });
	    deleteFormRow({ ss, sheetName: EDIT_SHEET.NAME, sheetRowNumber: a.sheetRowNumber });
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
    for (let i = rows.length - 1; i >= 0; i--) {
	const rowValues = rows[i] as SheetRowValues;
	const sheetRowNumber = EDIT_SHEET.HEADER_ROW + 1 + i + 1;
	const ready = rowValues[EDIT_SHEET.READY_TO_COMMIT] === true;
	if (!ready) continue;
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
	    errors.push(`Museum "${asTrimmedString(museumCell)}" is not valid. Expected "id - name".`);
	}
	errors.push(...validateRow(rowValues, EDIT_SHEET));
	if (errors.length > 0) {
	    errorsByRow.push({ row: sheetRowNumber, errors });
	    continue;
	}
	actions.push({ sheetRowNumber, museumId: museumId!, rowValues });
    }
    return { errorsByRow, actions };
}

function parseMuseumId(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const s = value.trim();
    if (!s) return null;
    const m = /^(.+?)\s*-\s*.+$/.exec(s);
    if (!m) return null;
    const id = m[1].trim();
    return id ? id : null;
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
