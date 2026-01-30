// Integration-ish tests for restoreMuseums() with SpreadsheetApp mocked

import { restoreMuseums } from "../src/restore";
import { DB_SHEET, TRASH_SHEET } from "../src/config";

type MockRange = {
    getValues: jest.Mock;
    setValues?: jest.Mock;
};

type MockTrashSheet = {
    getLastRow: jest.Mock;
    getLastColumn: jest.Mock;
    getRange: jest.Mock;
    deleteRow: jest.Mock;
};

type MockDbSheet = {
    getLastRow: jest.Mock;
    getLastColumn: jest.Mock;
    getRange: jest.Mock;
};

type MockSpreadsheet = {
    getSheetByName: jest.Mock;
};

function makeUi() {
    return { alert: jest.fn() };
}

function buildRow(lastCol: number, values: Record<number, unknown>): unknown[] {
    const row = new Array(lastCol).fill("");
    for (const [k, v] of Object.entries(values)) {
	row[Number(k)] = v;
    }
    return row;
}

describe("restoreMuseums (SpreadsheetApp mocked; real insertDatabaseToDatabase)", () => {
    beforeEach(() => {
	jest.resetAllMocks();
	const ui = makeUi();
	(globalThis as any).SpreadsheetApp = {
	    getActive: jest.fn(),
	    getUi: jest.fn(() => ui),
	};
	(globalThis as any).LockService = {
	    getDocumentLock: () => ({
		waitLock: jest.fn(),
		releaseLock: jest.fn(),
	    }),
	};
    });
    
    test("alerts when there are no rows to restore", () => {
	const trashSheet: MockTrashSheet = {
	    getLastRow: jest.fn(() => TRASH_SHEET.HEADER_ROW + 1),
	    getLastColumn: jest.fn(() => 10),
	    getRange: jest.fn(),
	    deleteRow: jest.fn(),
	};
	const ss: MockSpreadsheet = {
	    getSheetByName: jest.fn((name: string) => {
		if (name === TRASH_SHEET.NAME) return trashSheet as any;
		return null;
	    }),
	};
	
	(globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
	
	restoreMuseums();
	
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledWith("No restores to commit.");
	expect(trashSheet.deleteRow).not.toHaveBeenCalled();
    });
    
    test("alerts when no rows are marked ready to restore", () => {
	const trashLastCol = (TRASH_SHEET as any).NOTES + 1;
	const row1 = buildRow(trashLastCol, {
	    [TRASH_SHEET.RESTORE]: false,
	    [TRASH_SHEET.ID]: "mm.new.1",
	});
	const row2 = buildRow(trashLastCol, {
	    [TRASH_SHEET.RESTORE]: false,
	    [TRASH_SHEET.ID]: "mm.new.2",
	});
	const trashReadRange: MockRange = {
	    getValues: jest.fn(() => [row1, row2]),
	};
	const trashSheet: MockTrashSheet = {
	    getLastRow: jest.fn(() => TRASH_SHEET.HEADER_ROW + 1 + 2),
	    getLastColumn: jest.fn(() => trashLastCol),
	    getRange: jest.fn(() => trashReadRange as any),
	    deleteRow: jest.fn(),
	};
	const ss: MockSpreadsheet = {
	    getSheetByName: jest.fn((name: string) => {
		if (name === TRASH_SHEET.NAME) return trashSheet as any;
		return null;
	    }),
	};
	
	(globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
	
	restoreMuseums();
	
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledWith("No rows marked ready to restore.");
	expect(trashSheet.deleteRow).not.toHaveBeenCalled();
    });
    
    test("row marked restore but missing ID -> alerts with errors; does not write DB; does not delete trash row", () => {
	const trashLastCol = (TRASH_SHEET as any).NOTES + 1;
	const badRow = buildRow(trashLastCol, {
	    [TRASH_SHEET.RESTORE]: true,
	    [TRASH_SHEET.ID]: "", // missing
	});
	const trashReadRange: MockRange = {
	    getValues: jest.fn(() => [badRow]),
	};
	const trashSheet: MockTrashSheet = {
	    getLastRow: jest.fn(() => TRASH_SHEET.HEADER_ROW + 1 + 1),
	    getLastColumn: jest.fn(() => trashLastCol),
	    getRange: jest.fn(() => trashReadRange as any),
	    deleteRow: jest.fn(),
	};
	
	const ss: MockSpreadsheet = {
	    getSheetByName: jest.fn((name: string) => {
		if (name === TRASH_SHEET.NAME) return trashSheet as any;
		if (name === DB_SHEET.NAME) return null;
		return null;
	    }),
	};
	
	(globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
	
	restoreMuseums();
	
	expect(trashSheet.deleteRow).not.toHaveBeenCalled();
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledTimes(1);
	const msg = ui.alert.mock.calls[0][0];
	expect(typeof msg).toBe("string");
	expect(msg).toContain("Row");
	expect(msg).toContain("missing a Museum ID");
    });
    
    test("on success: appends exact DB fields to Database; deletes Trash row; alerts count", () => {
	const trashLastCol = (TRASH_SHEET as any).NOTES + 1;
	const trashRow = buildRow(trashLastCol, {
	    [TRASH_SHEET.RESTORE]: true,
	    [TRASH_SHEET.ID]: "mm.new.7",
	    [TRASH_SHEET.MUSEUM_NAME]: "Museum A",
	    [TRASH_SHEET.GOVERNANCE_BROAD]: "Local authority",
	    [TRASH_SHEET.GOVERNANCE]: "Local authority",
	    [TRASH_SHEET.SUBJECT_BROAD]: "Art",
	    [TRASH_SHEET.SUBJECT]: "Art: Painting",
	    [TRASH_SHEET.YEAR_OPENED_1]: "1999",
	    [TRASH_SHEET.YEAR_OPENED_2]: "2003",
	    [TRASH_SHEET.YEAR_CLOSED_1]: "2010",
	    [TRASH_SHEET.YEAR_CLOSED_2]: "2010",
	    [TRASH_SHEET.POSTCODE]: "SW1A 1AA",
	    [TRASH_SHEET.NOTES]: "hello",
	});
	const trashReadRange: MockRange = {
	    getValues: jest.fn(() => [trashRow]),
	};
	const trashSheet: MockTrashSheet = {
	    // header + 1 data row
	    getLastRow: jest.fn(() => TRASH_SHEET.HEADER_ROW + 1 + 1),
	    getLastColumn: jest.fn(() => trashLastCol),
	    getRange: jest.fn(() => trashReadRange as any),
	    deleteRow: jest.fn(),
	};
	const dbLastCol = DB_SHEET.NOTES + 1;
	const dbIdScanRange: MockRange = {
	    getValues: jest.fn(() => [["mm.new.1"], ["mm.new.2"]]),
	};
	const dbWriteRange: MockRange = {
	    getValues: jest.fn(),
	    setValues: jest.fn(),
	};
	const dbSheet: MockDbSheet = {
	    // header + 2 data rows
	    getLastRow: jest.fn(() => DB_SHEET.HEADER_ROW + 1 + 2),
	    getLastColumn: jest.fn(() => dbLastCol),
	    getRange: jest.fn((row: number, col: number, numRows: number, numCols: number) => {
		// ID scan
		if (numCols === 1 && col === DB_SHEET.ID + 1) {
		    return dbIdScanRange as any;
		}
		// Append write: destRowNumber, col=1, 1 row, full width
		if (col === 1 && numRows === 1 && numCols === dbLastCol) {
		    return dbWriteRange as any;
		}
		return { getValues: jest.fn(), setValues: jest.fn() } as any;
	    }),
	};
	const ss: MockSpreadsheet = {
	    getSheetByName: jest.fn((name: string) => {
		if (name === TRASH_SHEET.NAME) return trashSheet as any;
		if (name === DB_SHEET.NAME) return dbSheet as any;
		return null;
	    }),
	};
	
	(globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
	
	restoreMuseums();

	expect(trashSheet.deleteRow).toHaveBeenCalledWith(TRASH_SHEET.HEADER_ROW + 2);
	expect(dbWriteRange.setValues).toHaveBeenCalledTimes(1);
	const [[written2d]] = dbWriteRange.setValues!.mock.calls as unknown[][];
	const writtenRow = (written2d as any[][])[0];
	expect(writtenRow[DB_SHEET.ID]).toBe("mm.new.7");
	expect(writtenRow[DB_SHEET.MUSEUM_NAME]).toBe("Museum A");
	expect(writtenRow[DB_SHEET.GOVERNANCE_BROAD]).toBe("Local authority");
	expect(writtenRow[DB_SHEET.GOVERNANCE]).toBe("Local authority");
	expect(writtenRow[DB_SHEET.SUBJECT_BROAD]).toBe("Art");
	expect(writtenRow[DB_SHEET.SUBJECT]).toBe("Art: Painting");
	expect(writtenRow[DB_SHEET.YEAR_OPENED_1]).toBe("1999");
	expect(writtenRow[DB_SHEET.YEAR_OPENED_2]).toBe("2003");
	expect(writtenRow[DB_SHEET.YEAR_CLOSED_1]).toBe("2010");
	expect(writtenRow[DB_SHEET.YEAR_CLOSED_2]).toBe("2010");
	expect(writtenRow[DB_SHEET.POSTCODE]).toBe("SW1A 1AA");
	expect(writtenRow[DB_SHEET.NOTES]).toBe("hello");
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledTimes(1);
	expect(ui.alert.mock.calls[0][0]).toContain("Restored 1");
    });
    
    test("duplicate ID already in DB -> reports error; does not write DB; does not delete trash row", () => {
	const trashLastCol = (TRASH_SHEET as any).NOTES + 1;
	const trashRow = buildRow(trashLastCol, {
	    [TRASH_SHEET.RESTORE]: true,
	    [TRASH_SHEET.ID]: "mm.new.7",
	    [TRASH_SHEET.MUSEUM_NAME]: "Museum A",
	});
	const trashReadRange: MockRange = {
	    getValues: jest.fn(() => [trashRow]),
	};
	const trashSheet: MockTrashSheet = {
	    getLastRow: jest.fn(() => TRASH_SHEET.HEADER_ROW + 1 + 1),
	    getLastColumn: jest.fn(() => trashLastCol),
	    getRange: jest.fn(() => trashReadRange as any),
	    deleteRow: jest.fn(),
	};
	const dbLastCol = DB_SHEET.NOTES + 1;
	const dbIdScanRange: MockRange = {
	    getValues: jest.fn(() => [["mm.new.7"]]),
	};
	const dbWriteRange: MockRange = {
	    getValues: jest.fn(),
	    setValues: jest.fn(),
	};
	const dbSheet: MockDbSheet = {
	    // header + 1 data row
	    getLastRow: jest.fn(() => DB_SHEET.HEADER_ROW + 1 + 1),
	    getLastColumn: jest.fn(() => dbLastCol),
	    getRange: jest.fn((row: number, col: number, numRows: number, numCols: number) => {
		if (numCols === 1 && col === DB_SHEET.ID + 1) {
		    return dbIdScanRange as any;
		}
		if (col === 1 && numRows === 1 && numCols === dbLastCol) {
		    return dbWriteRange as any;
		}
		return { getValues: jest.fn(), setValues: jest.fn() } as any;
	    }),
	};
	const ss: MockSpreadsheet = {
	    getSheetByName: jest.fn((name: string) => {
		if (name === TRASH_SHEET.NAME) return trashSheet as any;
		if (name === DB_SHEET.NAME) return dbSheet as any;
		return null;
	    }),
	};
	
	(globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
	
	restoreMuseums();
	
	expect(dbWriteRange.setValues).not.toHaveBeenCalled();
	expect(trashSheet.deleteRow).not.toHaveBeenCalled();
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledTimes(1);
	const msg = ui.alert.mock.calls[0][0];
	expect(typeof msg).toBe("string");
	expect(msg).toContain("already exists");
	expect(msg).toContain("mm.new.7");
    });
});
