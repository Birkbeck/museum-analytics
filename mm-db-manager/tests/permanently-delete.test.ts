// Integration-ish tests for permanentlyDeleteMuseums() with SpreadsheetApp mocked.

import { permanentlyDeleteMuseums } from "../src/permanently-delete";
import { TRASH_SHEET } from "../src/config";

type MockRange = {
    getValues: jest.Mock;
};

type MockTrashSheet = {
    getLastRow: jest.Mock;
    getLastColumn: jest.Mock;
    getRange: jest.Mock;
    deleteRow: jest.Mock;
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

describe("permanentlyDeleteMuseums (SpreadsheetApp mocked)", () => {
    beforeEach(() => {
	jest.resetAllMocks();
	const ui = makeUi();
	(globalThis as any).SpreadsheetApp = {
	    getActive: jest.fn(),
	    getUi: jest.fn(() => ui),
	};
    });
    
    test("alerts when there are no rows in Trash", () => {
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
	
	permanentlyDeleteMuseums();
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledWith("No items to permanently delete.");
	expect(trashSheet.deleteRow).not.toHaveBeenCalled();
    });
    
    test("alerts when no rows are marked for permanent deletion", () => {
	const lastCol = (TRASH_SHEET as any).NOTES + 1;
	const row1 = buildRow(lastCol, {
	    [TRASH_SHEET.PERMANENTLY_DELETE]: false,
	});
	const row2 = buildRow(lastCol, {
	    [TRASH_SHEET.PERMANENTLY_DELETE]: false,
	});
	const range: MockRange = {
	    getValues: jest.fn(() => [row1, row2]),
	};
	const trashSheet: MockTrashSheet = {
	    getLastRow: jest.fn(() => TRASH_SHEET.HEADER_ROW + 1 + 2),
	    getLastColumn: jest.fn(() => lastCol),
	    getRange: jest.fn(() => range as any),
	    deleteRow: jest.fn(),
	};
	const ss: MockSpreadsheet = {
	    getSheetByName: jest.fn((name: string) => {
		if (name === TRASH_SHEET.NAME) return trashSheet as any;
		return null;
	    }),
	};
	
	(globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
	
	permanentlyDeleteMuseums();
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledWith("No rows marked for permanent deletion.");
	expect(trashSheet.deleteRow).not.toHaveBeenCalled();
    });
    
    test("deletes only rows marked PERMANENTLY_DELETE=true (bottom-up) and alerts count", () => {
	const lastCol = (TRASH_SHEET as any).NOTES + 1;
	// 3 data rows; mark rows 1 and 3 for deletion
	const row1 = buildRow(lastCol, {
	    [TRASH_SHEET.PERMANENTLY_DELETE]: true,
	});
	const row2 = buildRow(lastCol, {
	    [TRASH_SHEET.PERMANENTLY_DELETE]: false,
	});
	const row3 = buildRow(lastCol, {
	    [TRASH_SHEET.PERMANENTLY_DELETE]: true,
	});
	const range: MockRange = {
	    getValues: jest.fn(() => [row1, row2, row3]),
	};
	const trashSheet: MockTrashSheet = {
	    getLastRow: jest.fn(() => TRASH_SHEET.HEADER_ROW + 1 + 3),
	    getLastColumn: jest.fn(() => lastCol),
	    getRange: jest.fn(() => range as any),
	    deleteRow: jest.fn(),
	};
	const ss: MockSpreadsheet = {
	    getSheetByName: jest.fn((name: string) => {
		if (name === TRASH_SHEET.NAME) return trashSheet as any;
		return null;
	    }),
	};
	
	(globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
	
	permanentlyDeleteMuseums();

	// Row numbers in sheet are 1-indexed:
	// header row is 1 (HEADER_ROW=0), so data rows are 2,3,4.
	// Delete bottom-up => row 4 first then row 2.
	expect(trashSheet.deleteRow).toHaveBeenCalledTimes(2);
	expect(trashSheet.deleteRow.mock.calls[0][0]).toBe(TRASH_SHEET.HEADER_ROW + 4);
	expect(trashSheet.deleteRow.mock.calls[1][0]).toBe(TRASH_SHEET.HEADER_ROW + 2);
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledTimes(1);
	expect(ui.alert.mock.calls[0][0]).toContain("Permanently deleted 2");
    });
    
    test("if a deleteRow throws, reports formatted errors and continues", () => {
	const lastCol = (TRASH_SHEET as any).NOTES + 1;
	const row1 = buildRow(lastCol, {
	    [TRASH_SHEET.PERMANENTLY_DELETE]: true,
	});
	const row2 = buildRow(lastCol, {
	    [TRASH_SHEET.PERMANENTLY_DELETE]: true,
	});
	const range: MockRange = {
	    getValues: jest.fn(() => [row1, row2]),
	};
	const trashSheet: MockTrashSheet = {
	    getLastRow: jest.fn(() => TRASH_SHEET.HEADER_ROW + 1 + 2),
	    getLastColumn: jest.fn(() => lastCol),
	    getRange: jest.fn(() => range as any),
	    deleteRow: jest
		.fn()
            // delete bottom-up => tries row 3 then row 2
		.mockImplementationOnce(() => {
		    throw new Error("boom");
		})
		.mockImplementationOnce(() => {}),
	};
	const ss: MockSpreadsheet = {
	    getSheetByName: jest.fn((name: string) => {
		if (name === TRASH_SHEET.NAME) return trashSheet as any;
		return null;
	    }),
	};
	
	(globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
	
	permanentlyDeleteMuseums();
	
	expect(trashSheet.deleteRow).toHaveBeenCalledTimes(2);
	const ui = (globalThis as any).SpreadsheetApp.getUi();
	expect(ui.alert).toHaveBeenCalledTimes(1);
	const msg = ui.alert.mock.calls[0][0];
	expect(typeof msg).toBe("string");
	expect(msg).toContain("could not");
	expect(msg).toContain("Row");
	expect(msg).toContain("1");
    });
});
