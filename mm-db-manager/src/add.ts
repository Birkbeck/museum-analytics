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
    if (lastRow <= ADD_SHEET.HEADER_ROW) {
	SpreadsheetApp.getUi().alert("No rows to add.");
	return;
    }
    const numRows = lastRow - ADD_SHEET.HEADER_ROW;
    const range = addSheet.getRange(ADD_SHEET.HEADER_ROW + 1, 1, numRows, lastCol);
    const values = range.getValues();
    const errorsByRow = [];
    let addedCount = 0;
    for (let i = values.length - 1; i >= 0; i--) {
	const rowValues = values[i];
	const sheetRowNumber = ADD_SHEET.HEADER_ROW + i + 1;
	const ready = rowValues[ADD_SHEET.READY_TO_COMMIT - 1] === true;
	if (!ready) {
	    continue;
	}
	const errs = validateRow(rowValues, ADD_SHEET);
	if (errs.length > 0) {
	    errorsByRow.push({ row: sheetRowNumber, errors: errs });
	} else {
	    addRow(ss, rowValues)
	    deleteRow(sheetRowNumber);
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

function addRow(ss, rowValues: unknown[]): void {
}

function deleteRow(ss, sheetRowNumber: number): void {
}
