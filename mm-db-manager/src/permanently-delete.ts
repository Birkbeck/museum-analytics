import { TRASH_SHEET } from "./config";
import { formatErrors } from "./format-errors";

type RowError = { row: number; errors: string[] };

type SheetRowValues = unknown[];

type ReadyRow = {
    sheetRowNumber: number; // 1-indexed row number on Trash sheet
    rowValues: SheetRowValues;
};

/**
 * Permanently deletes rows from the Trash sheet.
 *
 * Behaviour:
 * - Only rows with PERMANENTLY_DELETE === true are processed
 * - Rows are deleted from the Trash sheet only (no DB interaction)
 * - Deletions occur bottom-up to avoid index shifting
 * - Rows not marked for permanent deletion are ignored
 *
 * Side effects:
 * - Deletes rows from the Trash sheet
 * - Displays UI alerts
 */
export function permanentlyDeleteMuseums(): void {
    const ss = SpreadsheetApp.getActive();
    const trashSheet = ss.getSheetByName(TRASH_SHEET.NAME);
    if (!trashSheet) {
	throw new Error(`Missing sheet: ${TRASH_SHEET.NAME}`);
    }
    const lastRow = trashSheet.getLastRow();
    const lastCol = trashSheet.getLastColumn();
    if (lastRow <= TRASH_SHEET.HEADER_ROW + 1) {
	SpreadsheetApp.getUi().alert("No items to permanently delete.");
	return;
    }
    const numRows = lastRow - (TRASH_SHEET.HEADER_ROW + 1);
    const range = trashSheet.getRange(
	TRASH_SHEET.HEADER_ROW + 2,
	1,
	numRows,
	lastCol
    );
    const rows = range.getValues() as unknown[][];
    const readyRows = getReadyToDeleteRows(rows);
    if (readyRows.length === 0) {
	SpreadsheetApp.getUi().alert("No rows marked for permanent deletion.");
	return;
    }
    const errorsByRow: RowError[] = [];
    let deletedCount = 0;
    // delete bottom-up
    readyRows.sort((a, b) => b.sheetRowNumber - a.sheetRowNumber);
    for (const { sheetRowNumber } of readyRows) {
	try {
	    trashSheet.deleteRow(sheetRowNumber);
	    deletedCount++;
	} catch (err) {
	    errorsByRow.push({
		row: sheetRowNumber,
		errors: ["Failed to permanently delete row."],
	    });
	}
    }
    if (errorsByRow.length > 0) {
	SpreadsheetApp.getUi().alert(formatErrors(errorsByRow, deletedCount));
    } else {
	SpreadsheetApp.getUi().alert(
	    deletedCount === 1
		? `Permanently deleted ${deletedCount} museum.`
		: `Permanently deleted ${deletedCount} museums.`
	);
    }
}

function getReadyToDeleteRows(rows: unknown[][]): ReadyRow[] {
    const readyRows: ReadyRow[] = [];
    // Iterate bottom-up so deletes are safe later
    for (let i = rows.length - 1; i >= 0; i--) {
	const rowValues = rows[i] as SheetRowValues;
	const sheetRowNumber = TRASH_SHEET.HEADER_ROW + 1 + i + 1;
	const ready = rowValues[TRASH_SHEET.PERMANENTLY_DELETE] === true;
	if (!ready) continue;
	readyRows.push({ sheetRowNumber, rowValues });
    }
    return readyRows;
}
