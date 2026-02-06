import { DB_SHEET, DELETE_SHEET, TRASH_SHEET } from "./config";
import { formatErrors } from "./format-errors";
import { asTrimmedString, parseMuseumId } from "./normalizers";
import { withDocumentLock } from "./lock";
import { logDatabaseChangeDate } from "./log-date";
import { insertDatabaseToDatabase } from "./insert";

type RowError = { row: number; errors: string[] };

type SheetRowValues = unknown[];

type ReadyRow = {
    sheetRowNumber: number; // 1-indexed row number on Delete sheet
    rowValues: SheetRowValues;
};

type TrashAction = {
    sheetRowNumber: number; // 1-indexed row number on Delete sheet
    museumId: string;
};

type ErrorsAndActions = {
    errorsByRow: RowError[];
    actions: TrashAction[];
};

/**
 * Commits all ready-to-delete rows from the Delete sheet:
 * - deletes the corresponding row from the Database
 * - copies the DB row into Trash (exact DB fields)
 * - deletes the row from the Delete sheet
 *
 * Side effects:
 * - Deletes rows from Database and Delete sheets
 * - Appends rows to Trash
 * - Displays UI alerts
 */
export function trashMuseums(): void {
    const ss = SpreadsheetApp.getActive();
    const deleteSheet = ss.getSheetByName(DELETE_SHEET.NAME);
    if (!deleteSheet) {
	throw new Error(`Missing sheet: ${DELETE_SHEET.NAME}`);
    }
    const lastRow = deleteSheet.getLastRow();
    const lastCol = deleteSheet.getLastColumn();
    if (lastRow <= DELETE_SHEET.HEADER_ROW + 1) {
	SpreadsheetApp.getUi().alert("No deletions to commit.");
	return;
    }
    const numRows = lastRow - (DELETE_SHEET.HEADER_ROW + 1);
    const range = deleteSheet.getRange(DELETE_SHEET.HEADER_ROW + 2, 1, numRows, lastCol);
    const rows = range.getValues() as unknown[][];
    const readyRows = getReadyToDeleteRows(rows);
    if (readyRows.length === 0) {
	SpreadsheetApp.getUi().alert("No rows marked ready to delete.");
	return;
    }
    const { errorsByRow, actions } = getErrorsAndActions(readyRows);
    if (actions.length === 0) {
	SpreadsheetApp.getUi().alert(formatErrors(errorsByRow, 0));
	return;
    }
    let trashedCount = 0;
    withDocumentLock(() => {
	const dbSheet = ss.getSheetByName(DB_SHEET.NAME);
	if (!dbSheet) {
	    throw new Error(`Missing sheet: ${DB_SHEET.NAME}`);
	}
	const trashSheet = ss.getSheetByName(TRASH_SHEET.NAME);
	if (!trashSheet) {
	    throw new Error(`Missing sheet: ${TRASH_SHEET.NAME}`);
	}
	const idToDbRow = buildDbIdRowMap(dbSheet);
	// Delete DB rows in descending DB row order to avoid index shifts.
	const resolved: Array<TrashAction & { dbRowNumber: number }> = [];
	for (const a of actions) {
	    const dbRowNumber = idToDbRow.get(a.museumId);
	    if (!dbRowNumber) {
		errorsByRow.push({
		    row: a.sheetRowNumber,
		    errors: [`Museum ID "${a.museumId}" not found in ${DB_SHEET.NAME}.`],
		});
		continue;
	    }
	    resolved.push({ ...a, dbRowNumber });
	}
	resolved.sort((a, b) => b.dbRowNumber - a.dbRowNumber);
	for (const a of resolved) {
	    const dbLastCol = dbSheet.getLastColumn();
	    const dbRowValues = dbSheet.getRange(a.dbRowNumber, 1, 1, dbLastCol).getValues()[0];
	    const trashRowNumber = findFirstBlankRow(
		trashSheet,
		TRASH_SHEET.ID + 1,
		TRASH_SHEET.HEADER_ROW + 1
	    );
	    insertDatabaseToDatabase({
		destSheet: trashSheet,
		destRowNumber: trashRowNumber,
		destMapping: TRASH_SHEET,
		sourceRowValues: dbRowValues,
		sourceMapping: DB_SHEET,
	    });
	    dbSheet.deleteRow(a.dbRowNumber);
	    trashedCount++;
	}
	const deleteRowNumbers = resolved.map((a) => a.sheetRowNumber).sort((x, y) => y - x);
	for (const sheetRowNumber of deleteRowNumbers) {
	    deleteSheet.deleteRow(sheetRowNumber);
	}
    });
    if (errorsByRow.length > 0) {
	SpreadsheetApp.getUi().alert(formatErrors(errorsByRow, trashedCount));
    } else {
	withDocumentLock(() => {
	    logDatabaseChangeDate();
	});
	SpreadsheetApp.getUi().alert(
	    trashedCount === 1
		? `Moved ${trashedCount} museum to Trash.`
		: `Moved ${trashedCount} museums to Trash.`
	);
    }
}

function getReadyToDeleteRows(rows: unknown[][]): ReadyRow[] {
    const readyRows: ReadyRow[] = [];
    for (let i = rows.length - 1; i >= 0; i--) {
	const rowValues = rows[i] as SheetRowValues;
	const sheetRowNumber = DELETE_SHEET.HEADER_ROW + 1 + i + 1;
	const ready = rowValues[DELETE_SHEET.READY_TO_DELETE] === true;
	if (!ready) {
	    continue;
	}
	readyRows.push({ sheetRowNumber, rowValues });
    }
    return readyRows;
}

function getErrorsAndActions(readyRows: ReadyRow[]): ErrorsAndActions {
    const errorsByRow: RowError[] = [];
    const actions: TrashAction[] = [];
    for (const { sheetRowNumber, rowValues } of readyRows) {
	const errs: string[] = [];
	const museumCell = rowValues[DELETE_SHEET.MUSEUM];
	const museumId = parseMuseumId(museumCell);
	if (!museumId) {
	    errs.push(
		`Museum "${asTrimmedString(museumCell)}" is not valid. Expected "id - name".`
	    );
	}
	if (errs.length > 0) {
	    errorsByRow.push({ row: sheetRowNumber, errors: errs });
	    continue;
	}
	actions.push({ sheetRowNumber, museumId: museumId! });
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

/**
 * Finds the first row (1-indexed) after the header where the given column is blank.
 * If no blank row is found within the scan range, returns the next row.
 *
 * - `column` is 1-indexed
 * - `headerRow` is 1-indexed
 */
export function findFirstBlankRow(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  column: number,
  headerRow: number,
  scanLimit = 2000
): number {
  const startRow = headerRow + 1;
  const values = sheet
    .getRange(startRow, column, scanLimit, 1)
    .getValues() ?? [];
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0] ?? "").trim() === "") {
      return startRow + i;
    }
  }
  // No blank rows found → append after scanned range
  return startRow + values.length;
}
