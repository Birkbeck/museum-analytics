// Integration-ish tests for editMuseums() with SpreadsheetApp mocked

import {
    editMuseums
} from "../src/edit";
import {
    validateRow
} from "../src/validators";
import {
    EDIT_SHEET,
    DB_SHEET
} from "../src/config";

jest.mock("../src/validators", () => ({
    validateRow: jest.fn(),
}));

type MockRange = {
    getValues: jest.Mock;
    setValues?: jest.Mock;
};

type MockEditSheet = {
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

describe("editMuseums (SpreadsheetApp mocked; real config)", () => {
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
    
    test("alerts when there are no rows to edit", () => {
	const editSheet: MockEditSheet = {
	    getLastRow: jest.fn(() => EDIT_SHEET.HEADER_ROW + 1),
	    getLastColumn: jest.fn(() => 10),
	    getRange: jest.fn(),
	    deleteRow: jest.fn(),
	};
	const ss: MockSpreadsheet = {
	    getSheetByName: jest.fn((name: string) => {
		if (name === EDIT_SHEET.NAME) return editSheet as any;
		return null;
	    }),
	};

	(globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
	
	editMuseums();
	
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledWith("No edits to commit.");
	expect(validateRow).not.toHaveBeenCalled();
	expect(editSheet.deleteRow).not.toHaveBeenCalled();
    });
    
    test("alerts when there are no rows marked ready to commit", () => {
	const lastCol = EDIT_SHEET.NOTES + 1;
	const row1 = buildRow(lastCol, {
	    [EDIT_SHEET.READY_TO_COMMIT]: false,
	    [EDIT_SHEET.MUSEUM]: "mm.new.1 - Museum A",
	});
	const row2 = buildRow(lastCol, {
	    [EDIT_SHEET.READY_TO_COMMIT]: false,
	    [EDIT_SHEET.MUSEUM]: "mm.new.2 - Museum B",
	});
	const range: MockRange = {
	    getValues: jest.fn(() => [row1, row2]),
	};
	const editSheet: MockEditSheet = {
	    getLastRow: jest.fn(() => EDIT_SHEET.HEADER_ROW + 1 + 2),
	    getLastColumn: jest.fn(() => lastCol),
	    getRange: jest.fn(() => range as any),
	    deleteRow: jest.fn(),
	};
	const ss: MockSpreadsheet = {
	    getSheetByName: jest.fn((name: string) => {
		if (name === EDIT_SHEET.NAME) return editSheet as any;
		return null;
	    }),
	};
	
	(globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
	
	editMuseums();
	
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledWith("No rows marked ready to commit.");
	expect(validateRow).not.toHaveBeenCalled();
	expect(editSheet.deleteRow).not.toHaveBeenCalled();
    });

    test("validates ready rows and alerts with errors; does not delete edit row; does not touch DB", () => {
	const lastCol = EDIT_SHEET.NOTES + 1;
	const readyRow = buildRow(lastCol, {
	    [EDIT_SHEET.READY_TO_COMMIT]: true,
	    [EDIT_SHEET.MUSEUM]: "mm.new.7 - Museum A",
	    [EDIT_SHEET.MUSEUM_NAME]: "Museum A",
	});
	const range: MockRange = {
	    getValues: jest.fn(() => [readyRow]),
	};
	const editSheet: MockEditSheet = {
	    getLastRow: jest.fn(() => EDIT_SHEET.HEADER_ROW + 1 + 1),
	    getLastColumn: jest.fn(() => lastCol),
	    getRange: jest.fn(() => range as any),
	    deleteRow: jest.fn(),
	};
	const ss: MockSpreadsheet = {
	    getSheetByName: jest.fn((name: string) => {
		if (name === EDIT_SHEET.NAME) return editSheet as any;
		// DB sheet should NOT be fetched when there are no actions
		if (name === DB_SHEET.NAME) return null;
		return null;
	    }),
	};
	
	(globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
	(validateRow as jest.Mock).mockReturnValueOnce([
	    "Postcode X is not a correctly formatted UK postcode.",
	]);
	
	editMuseums();
	
	expect(validateRow).toHaveBeenCalledTimes(1);
	expect(editSheet.deleteRow).not.toHaveBeenCalled();
	expect(ss.getSheetByName).not.toHaveBeenCalledWith(DB_SHEET.NAME);
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledTimes(1);
	const msg = ui.alert.mock.calls[0][0];
	expect(typeof msg).toBe("string");
	expect(msg).toContain("Row");
	expect(msg).toContain("Postcode");
    });
    
    test("on success: updates DB row, deletes Edit row, alerts edited count", () => {
	const lastColEdit = EDIT_SHEET.NOTES + 1;
	const editRowValues = buildRow(lastColEdit, {
	    [EDIT_SHEET.READY_TO_COMMIT]: true,
	    [EDIT_SHEET.MUSEUM]: "mm.new.7 - Museum A",
	    [EDIT_SHEET.MUSEUM_NAME]: "  New Museum Name  ",
	    [EDIT_SHEET.POSTCODE]: "sw1a 1aa",
	    [EDIT_SHEET.YEAR_OPENED]: "1999/2003",
	    [EDIT_SHEET.YEAR_CLOSED]: "2010",
	    [EDIT_SHEET.WIKIDATA_ID]: "Q42",
	    [EDIT_SHEET.GOVERNANCE]: "Public: Local authority",
	    [EDIT_SHEET.SUBJECT]: "Art: Painting",
	    [EDIT_SHEET.NOTES]: "  hello  ",
	});
	const editRange: MockRange = {
	    getValues: jest.fn(() => [editRowValues]),
	};
	const editSheet: MockEditSheet = {
	    getLastRow: jest.fn(() => EDIT_SHEET.HEADER_ROW + 1 + 1),
	    getLastColumn: jest.fn(() => lastColEdit),
	    getRange: jest.fn(() => editRange as any),
	    deleteRow: jest.fn(),
	};
	
	(validateRow as jest.Mock).mockReturnValueOnce([]);
	
	const dbLastCol = DB_SHEET.NOTES + 1;
	const dbIdScanRange: MockRange = {
	    getValues: jest.fn(() => [["mm.new.7"]]),
	};
	const existingRow = new Array(dbLastCol).fill("");
	existingRow[DB_SHEET.ID] = "mm.new.7";
	existingRow[DB_SHEET.MUSEUM_NAME] = "Old Name";
	existingRow[DB_SHEET.GOVERNANCE_BROAD] = "OldBroad";
	existingRow[DB_SHEET.SUBJECT_BROAD] = "OldBroad2";
	const dbRowRange: MockRange = {
	    getValues: jest.fn(() => [existingRow]),
	    setValues: jest.fn(),
	};
	const dbSheet: MockDbSheet = {
	    // header + 1 data row
	    getLastRow: jest.fn(() => DB_SHEET.HEADER_ROW + 1 + 1),
	    getLastColumn: jest.fn(() => dbLastCol),
	    getRange: jest.fn((row: number, col: number, numRows: number, numCols: number) => {
		// ID scan for buildDbIdRowMap
		if (numCols === 1 && col === DB_SHEET.ID + 1) {
		    return dbIdScanRange as any;
		}
		// Read + write the DB row (dbRowNumber will be 2 here)
		if (col === 1 && numRows === 1 && numCols === dbLastCol) {
		    return dbRowRange as any;
		}
		return { getValues: jest.fn(), setValues: jest.fn() } as any;
	    }),
	};
	const ss: MockSpreadsheet = {
	    getSheetByName: jest.fn((name: string) => {
		if (name === EDIT_SHEET.NAME) return editSheet as any;
		if (name === DB_SHEET.NAME) return dbSheet as any;
		return null;
	    }),
	};
	
	(globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
	
	editMuseums();
	
	expect(editSheet.deleteRow).toHaveBeenCalledWith(EDIT_SHEET.HEADER_ROW + 2);
	expect(dbRowRange.setValues).toHaveBeenCalledTimes(1);
	const [[written2d]] = dbRowRange.setValues!.mock.calls as unknown[][];
	const writtenRow = (written2d as any[][])[0];
	expect(writtenRow[DB_SHEET.ID]).toBe("mm.new.7");
	expect(writtenRow[DB_SHEET.MUSEUM_NAME]).toBe("New Museum Name");
	expect(writtenRow[DB_SHEET.POSTCODE]).toBe("SW1A 1AA");
	expect(writtenRow[DB_SHEET.YEAR_OPENED_1]).toBe("1999");
	expect(writtenRow[DB_SHEET.YEAR_OPENED_2]).toBe("2003");
	expect(writtenRow[DB_SHEET.YEAR_CLOSED_1]).toBe("2010");
	expect(writtenRow[DB_SHEET.YEAR_CLOSED_2]).toBe("2010");
	expect(writtenRow[DB_SHEET.GOVERNANCE_BROAD]).toBe("Public");
	expect(writtenRow[DB_SHEET.SUBJECT_BROAD]).toBe("Art");
	expect(writtenRow[DB_SHEET.NOTES]).toBe("hello");
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledWith("Edited 1 museum in Database.");
    });
    
    test("if museum ID is not found in DB: alerts with error and does not delete edit row", () => {
	const lastColEdit = EDIT_SHEET.NOTES + 1;
	const editRowValues = buildRow(lastColEdit, {
	    [EDIT_SHEET.READY_TO_COMMIT]: true,
	    [EDIT_SHEET.MUSEUM]: "mm.new.999 - Missing Museum",
	    [EDIT_SHEET.MUSEUM_NAME]: "Missing Museum",
	    [EDIT_SHEET.GOVERNANCE]: "Public: Local authority",
	    [EDIT_SHEET.SUBJECT]: "Art: Painting",
	    [EDIT_SHEET.POSTCODE]: "SW1A 1AA",
	    [EDIT_SHEET.YEAR_OPENED]: "2000",
	    [EDIT_SHEET.YEAR_CLOSED]: "",
	});
	const editRange: MockRange = {
	    getValues: jest.fn(() => [editRowValues]),
	};
	const editSheet: MockEditSheet = {
	    getLastRow: jest.fn(() => EDIT_SHEET.HEADER_ROW + 1 + 1),
	    getLastColumn: jest.fn(() => lastColEdit),
	    getRange: jest.fn(() => editRange as any),
	    deleteRow: jest.fn(),
	};
	
	(validateRow as jest.Mock).mockReturnValueOnce([]);
	
	const dbLastCol = DB_SHEET.NOTES + 1;
	const dbIdScanRange: MockRange = {
	    getValues: jest.fn(() => [["mm.new.7"], ["mm.new.8"]]),
	};
	const dbSheet: MockDbSheet = {
	    getLastRow: jest.fn(() => DB_SHEET.HEADER_ROW + 1 + 2),
	    getLastColumn: jest.fn(() => dbLastCol),
	    getRange: jest.fn((row: number, col: number, numRows: number, numCols: number) => {
		if (numCols === 1 && col === DB_SHEET.ID + 1) {
		    return dbIdScanRange as any;
		}
		return { getValues: jest.fn(), setValues: jest.fn() } as any;
	    }),
	};
	const ss: MockSpreadsheet = {
	    getSheetByName: jest.fn((name: string) => {
		if (name === EDIT_SHEET.NAME) return editSheet as any;
		if (name === DB_SHEET.NAME) return dbSheet as any;
		return null;
	    }),
	};
	
	(globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
	
	editMuseums();
	
	expect(editSheet.deleteRow).not.toHaveBeenCalled();
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledTimes(1);
	const msg = ui.alert.mock.calls[0][0];
	expect(typeof msg).toBe("string");
	expect(msg).toContain("not found");
	expect(msg).toContain("mm.new.999");
    });
});
