// Integration-ish tests for trashMuseums() with SpreadsheetApp mocked

import { trashMuseums } from "../src/trash";
import { DELETE_SHEET, DB_SHEET, INSTRUCTIONS_SHEET, TRASH_SHEET } from "../src/config";

type MockRange = {
    getValues: jest.Mock;
    setValues?: jest.Mock;
    setValue?: jest.Mock;
};

type MockDeleteSheet = {
    getLastRow: jest.Mock;
    getLastColumn: jest.Mock;
    getRange: jest.Mock;
    deleteRow: jest.Mock;
};

type MockDbSheet = {
    getLastRow: jest.Mock;
    getLastColumn: jest.Mock;
    getRange: jest.Mock;
    deleteRow: jest.Mock;
};

type MockTrashSheet = {
    getLastRow: jest.Mock;
    getLastColumn: jest.Mock;
    getRange: jest.Mock;
};

type MockInstructionSheet = {
    getRange: jest.Mock;
}

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

describe("trashMuseums (SpreadsheetApp mocked; real insertDatabaseToDatabase)", () => {
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
    
    test("alerts when there are no rows to delete", () => {
	const deleteSheet: MockDeleteSheet = {
	    getLastRow: jest.fn(() => DELETE_SHEET.HEADER_ROW + 1),
	    getLastColumn: jest.fn(() => 10),
	    getRange: jest.fn(),
	    deleteRow: jest.fn(),
	};
	const ss: MockSpreadsheet = {
	    getSheetByName: jest.fn((name: string) => {
		if (name === DELETE_SHEET.NAME) return deleteSheet as any;
		return null;
	    }),
	};
	(globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
	
	trashMuseums();
	
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledWith("No deletions to commit.");
	expect(deleteSheet.deleteRow).not.toHaveBeenCalled();
    });
    
    test("alerts when no rows are marked ready to delete", () => {
	const lastCol = DELETE_SHEET.NOTES + 1;
	const row1 = buildRow(lastCol, {
	    [DELETE_SHEET.READY_TO_DELETE]: false,
	    [DELETE_SHEET.MUSEUM]: "mm.new.1 - Museum A",
	});
	const row2 = buildRow(lastCol, {
	    [DELETE_SHEET.READY_TO_DELETE]: false,
	    [DELETE_SHEET.MUSEUM]: "mm.new.2 - Museum B",
	});
	const range: MockRange = {
	    getValues: jest.fn(() => [row1, row2]),
	};
	const deleteSheet: MockDeleteSheet = {
	    getLastRow: jest.fn(() => DELETE_SHEET.HEADER_ROW + 1 + 2),
	    getLastColumn: jest.fn(() => lastCol),
	    getRange: jest.fn(() => range as any),
	    deleteRow: jest.fn(),
	};
	const ss: MockSpreadsheet = {
	    getSheetByName: jest.fn((name: string) => {
		if (name === DELETE_SHEET.NAME) return deleteSheet as any;
		return null;
	    }),
	};
	(globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
	
	trashMuseums();
	
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledWith("No rows marked ready to delete.");
	expect(deleteSheet.deleteRow).not.toHaveBeenCalled();
    });
    
    test('invalid museum cell (not "id - name") -> alerts with errors; does not delete DB or form row; does not write to Trash', () => {
	const lastCol = DELETE_SHEET.NOTES + 1;
	const badRow = buildRow(lastCol, {
	    [DELETE_SHEET.READY_TO_DELETE]: true,
	    [DELETE_SHEET.MUSEUM]: "mm.new.7", // invalid format
	});
	const range: MockRange = {
	    getValues: jest.fn(() => [badRow]),
	};
	const deleteSheet: MockDeleteSheet = {
	    getLastRow: jest.fn(() => DELETE_SHEET.HEADER_ROW + 1 + 1),
	    getLastColumn: jest.fn(() => lastCol),
	    getRange: jest.fn(() => range as any),
	    deleteRow: jest.fn(),
	};
	const ss: MockSpreadsheet = {
	    getSheetByName: jest.fn((name: string) => {
		if (name === DELETE_SHEET.NAME) return deleteSheet as any;
		if (name === DB_SHEET.NAME) return null;
		if (name === TRASH_SHEET.NAME) return null;
		return null;
	    }),
	};
	
	(globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
	
	trashMuseums();
	
	expect(deleteSheet.deleteRow).not.toHaveBeenCalled();
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledTimes(1);
	const msg = ui.alert.mock.calls[0][0];
	expect(typeof msg).toBe("string");
	expect(msg).toContain("Row");
	expect(msg).toContain('Expected "id - name"');
    });
    
    test("on success: deletes DB row, appends exact DB fields to Trash, deletes Delete row, alerts count", () => {
	const lastColDelete = DELETE_SHEET.NOTES + 1;
	const deleteRowValues = buildRow(lastColDelete, {
	    [DELETE_SHEET.READY_TO_DELETE]: true,
	    [DELETE_SHEET.MUSEUM]: "mm.new.7 - Museum A",
	});
	const deleteRange: MockRange = {
	    getValues: jest.fn(() => [deleteRowValues]),
	};
	const deleteSheet: MockDeleteSheet = {
	    getLastRow: jest.fn(() => DELETE_SHEET.HEADER_ROW + 1 + 1),
	    getLastColumn: jest.fn(() => lastColDelete),
	    getRange: jest.fn(() => deleteRange as any),
	    deleteRow: jest.fn(),
	};
	const dbLastCol = DB_SHEET.NOTES + 1;
	const dbIdScanRange: MockRange = {
	    getValues: jest.fn(() => [["mm.new.7"]]),
	};
	const dbRow = new Array(dbLastCol).fill("");
	dbRow[DB_SHEET.ID] = "mm.new.7";
	dbRow[DB_SHEET.MUSEUM_NAME] = "Museum A";
	dbRow[DB_SHEET.GOVERNANCE_BROAD] = "Local authority";
	dbRow[DB_SHEET.GOVERNANCE] = "Local authority";
	dbRow[DB_SHEET.SUBJECT_BROAD] = "Art";
	dbRow[DB_SHEET.SUBJECT] = "Art: Painting";
	dbRow[DB_SHEET.YEAR_OPENED_1] = "1999";
	dbRow[DB_SHEET.YEAR_OPENED_2] = "2003";
	dbRow[DB_SHEET.YEAR_CLOSED_1] = "2010";
	dbRow[DB_SHEET.YEAR_CLOSED_2] = "2010";
	dbRow[DB_SHEET.POSTCODE] = "SW1A 1AA";
	dbRow[DB_SHEET.NOTES] = "hello";
	const dbReadRange: MockRange = {
	    getValues: jest.fn(() => [dbRow]),
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
		    return dbReadRange as any;
		}
		return { getValues: jest.fn(), setValues: jest.fn() } as any;
	    }),
	    deleteRow: jest.fn(),
	};
	const trashLastCol = (TRASH_SHEET as any).NOTES + 1; // relies on TRASH_SHEET.NOTES existing
	const trashWriteRange: MockRange = {
	    getValues: jest.fn(),
	    setValues: jest.fn(),
	};
	const trashSheet: MockTrashSheet = {
	    // header only at start; next appended row is header+2
	    getLastRow: jest.fn(() => TRASH_SHEET.HEADER_ROW + 1),
	    getLastColumn: jest.fn(() => trashLastCol),
	    getRange: jest.fn((row: number, col: number, numRows: number, numCols: number) => {
		if (col === 1 && numRows === 1 && numCols === trashLastCol) {
		    return trashWriteRange as any;
		}
		return { getValues: jest.fn(), setValues: jest.fn() } as any;
	    }),
	};
	const instructionRange: MockRange = {
	    getValues: jest.fn(() => [[]]),
	    setValue: jest.fn(() => null)
	}
	const instructionSheet: MockInstructionSheet = {
	    getRange: jest.fn(() => instructionRange as any)
	};
	const ss: MockSpreadsheet = {
	    getSheetByName: jest.fn((name: string) => {
		if (name === DELETE_SHEET.NAME) return deleteSheet as any;
		if (name === DB_SHEET.NAME) return dbSheet as any;
		if (name === TRASH_SHEET.NAME) return trashSheet as any;
		if (name === INSTRUCTIONS_SHEET.NAME) return instructionSheet as any;
		return null;
	    }),
	};
	
	(globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
	
	trashMuseums();
	
	expect(dbSheet.deleteRow).toHaveBeenCalledWith(DB_SHEET.HEADER_ROW + 2);
	expect(deleteSheet.deleteRow).toHaveBeenCalledWith(DELETE_SHEET.HEADER_ROW + 2);
	expect(trashWriteRange.setValues).toHaveBeenCalledTimes(1);
	const [[written2d]] = trashWriteRange.setValues!.mock.calls as unknown[][];
	const writtenRow = (written2d as any[][])[0];
	expect(writtenRow[TRASH_SHEET.ID]).toBe("mm.new.7");
	expect(writtenRow[TRASH_SHEET.MUSEUM_NAME]).toBe("Museum A");
	expect(writtenRow[TRASH_SHEET.GOVERNANCE_BROAD]).toBe("Local authority");
	expect(writtenRow[TRASH_SHEET.GOVERNANCE]).toBe("Local authority");
	expect(writtenRow[TRASH_SHEET.SUBJECT_BROAD]).toBe("Art");
	expect(writtenRow[TRASH_SHEET.SUBJECT]).toBe("Art: Painting");
	expect(writtenRow[TRASH_SHEET.YEAR_OPENED_1]).toBe("1999");
	expect(writtenRow[TRASH_SHEET.YEAR_OPENED_2]).toBe("2003");
	expect(writtenRow[TRASH_SHEET.YEAR_CLOSED_1]).toBe("2010");
	expect(writtenRow[TRASH_SHEET.YEAR_CLOSED_2]).toBe("2010");
	expect(writtenRow[TRASH_SHEET.POSTCODE]).toBe("SW1A 1AA");
	expect(writtenRow[TRASH_SHEET.NOTES]).toBe("hello");
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledTimes(1);
	expect(ui.alert.mock.calls[0][0]).toContain("Moved 1");
    });
    
    test("ID not found in DB -> alerts with error; does not delete DB row; does not write to Trash; does not delete Delete row", () => {
	const lastColDelete = DELETE_SHEET.NOTES + 1;
	const deleteRowValues = buildRow(lastColDelete, {
	    [DELETE_SHEET.READY_TO_DELETE]: true,
	    [DELETE_SHEET.MUSEUM]: "mm.new.999 - Missing Museum",
	});
	const deleteRange: MockRange = {
	    getValues: jest.fn(() => [deleteRowValues]),
	};
	const deleteSheet: MockDeleteSheet = {
	    getLastRow: jest.fn(() => DELETE_SHEET.HEADER_ROW + 1 + 1),
	    getLastColumn: jest.fn(() => lastColDelete),
	    getRange: jest.fn(() => deleteRange as any),
	    deleteRow: jest.fn(),
	};
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
	    deleteRow: jest.fn(),
	};
	const trashSheet: MockTrashSheet = {
	    getLastRow: jest.fn(() => TRASH_SHEET.HEADER_ROW + 1),
	    getLastColumn: jest.fn(() => (TRASH_SHEET as any).NOTES + 1),
	    getRange: jest.fn(() => ({ getValues: jest.fn(), setValues: jest.fn() }) as any),
	};
	const ss: MockSpreadsheet = {
	    getSheetByName: jest.fn((name: string) => {
		if (name === DELETE_SHEET.NAME) return deleteSheet as any;
		if (name === DB_SHEET.NAME) return dbSheet as any;
		if (name === TRASH_SHEET.NAME) return trashSheet as any;
		return null;
	    }),
	};
	
	(globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
	
	trashMuseums();
	
	expect(dbSheet.deleteRow).not.toHaveBeenCalled();
	expect(deleteSheet.deleteRow).not.toHaveBeenCalled();
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledTimes(1);
	const msg = ui.alert.mock.calls[0][0];
	expect(typeof msg).toBe("string");
	expect(msg).toContain("not found");
	expect(msg).toContain("mm.new.999");
    });
});
