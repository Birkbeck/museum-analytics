export function addMuseums(): void {
    const ss = SpreadsheetApp.getActive();
    const addSheet = ss.getSheetByName(CONFIG.ADD_SHEET_NAME);
    if (!addSheet) {
	throw new Error(`Missing sheet: ${CONFIG.ADD_SHEET_NAME}`);
    }
    const lastRow = addSheet.getLastRow();
    const lastCol = addSheet.getLastColumn();
    if (lastRow <= CONFIG.HEADER_ROW) {
	SpreadsheetApp.getUi().alert("No rows to add.");
	return;
    }
    const numRows = lastRow - CONFIG.HEADER_ROW;
    const range = addSheet.getRange(CONFIG.HEADER_ROW + 1, 1, numRows, lastCol);
    const values = range.getValues();
    const errorsByRow = [];
    let addedCount = 0;
    for (let i = values.length - 1; i >= 0; i--) {
	const rowValues = values[i];
	const sheetRowNumber = CONFIG.HEADER_ROW + 1 + i;
	const ready = rowValues[CONFIG.READY_TO_COMMIT_COL - 1] === true;
	if (!ready) {
	    continue;
	}
	const errs = add_row(ss, rowValues, sheetRowNumber);
	if (errs.length > 0) {
	    errorsByRow.push({ row: sheetRowNumber, errors: errs });
	} else {
	    delete_row(sheetRowNumber);
	    addedCount++;
	}
    }
    if (errorsByRow.length > 0) {
	const msg = formatErrors_(errorsByRow, addedCount);
	SpreadsheetApp.getUi().alert(msg);
    } else {
	SpreadsheetApp.getUi().alert(`Added ${addedCount} row(s) to DB.`);
    }
}
