// Integration-ish tests for addMuseums() with SpreadsheetApp mocked,

import { addMuseums } from "../src/add";
import { validateRow } from "../src/validators";
import { ADD_SHEET, DB_SHEET } from "../src/config";

jest.mock("../src/validators", () => ({
  validateRow: jest.fn(),
}));

type MockRange = {
  getValues: jest.Mock;
  setValues?: jest.Mock;
};

type MockAddSheet = {
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

describe("addMuseums (SpreadsheetApp mocked; real config)", () => {
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

  test("alerts when there are no rows to add", () => {
    const addSheet: MockAddSheet = {
      getLastRow: jest.fn(() => ADD_SHEET.HEADER_ROW + 1),
      getLastColumn: jest.fn(() => 10),
      getRange: jest.fn(),
      deleteRow: jest.fn(),
    };
    const ss: MockSpreadsheet = {
      getSheetByName: jest.fn((name: string) => {
        if (name === ADD_SHEET.NAME) return addSheet as any;
        return null;
      }),
    };
    (globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
    addMuseums();
    const ui = (globalThis as any).SpreadsheetApp.getUi();
    expect(ui.alert).toHaveBeenCalledWith("No rows to add.");
    expect(validateRow).not.toHaveBeenCalled();
    expect(addSheet.deleteRow).not.toHaveBeenCalled();
  });

  test("skips not ready to commit rows; validates ready rows; alerts with errors", () => {
    const lastCol = ADD_SHEET.NOTES + 1;
    const readyRow = buildRow(lastCol, {
      [ADD_SHEET.READY_TO_COMMIT]: true,
      [ADD_SHEET.MUSEUM_NAME]: "Museum A",
    });
    const notReadyRow = buildRow(lastCol, {
      [ADD_SHEET.READY_TO_COMMIT]: false,
      [ADD_SHEET.MUSEUM_NAME]: "Museum B",
    });
    const range: MockRange = {
      getValues: jest.fn(() => [readyRow, notReadyRow]),
    };
    const addSheet: MockAddSheet = {
      // header + 2 data rows
      getLastRow: jest.fn(() => ADD_SHEET.HEADER_ROW + 1 + 2),
      getLastColumn: jest.fn(() => lastCol),
      getRange: jest.fn(() => range as any),
      deleteRow: jest.fn(),
    };
    const ss: MockSpreadsheet = {
      getSheetByName: jest.fn((name: string) => {
        if (name === ADD_SHEET.NAME) return addSheet as any;
        // DB sheet not needed on validation failure path
        return null;
      }),
    };

    (globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);
    (validateRow as jest.Mock).mockReturnValueOnce(["Museum must have a name."]);

    addMuseums();

    expect(validateRow).toHaveBeenCalledTimes(1);
    expect(addSheet.deleteRow).not.toHaveBeenCalled();
    const ui = (globalThis as any).SpreadsheetApp.getUi();
    expect(ui.alert).toHaveBeenCalledTimes(1);
    const msg = ui.alert.mock.calls[0][0];
    expect(typeof msg).toBe("string");
    expect(msg).toContain("could not be added");
    expect(msg).toContain("Row");
    expect(msg).toContain("Museum must have a name");
  });

  test("on success: deletes Add row, alerts added count; writes expected values", () => {
    const lastColAdd = ADD_SHEET.NOTES + 1;
    const addRowValues = buildRow(lastColAdd, {
      [ADD_SHEET.READY_TO_COMMIT]: true,
      [ADD_SHEET.MUSEUM_NAME]: " Museum A ",
      [ADD_SHEET.POSTCODE]: "sw1a 1aa",
      [ADD_SHEET.YEAR_OPENED]: "1999/2003",
      [ADD_SHEET.YEAR_CLOSED]: "2010",
      [ADD_SHEET.WIKIDATA_ID]: "Q42",
    });
    const addRange: MockRange = {
      getValues: jest.fn(() => [addRowValues]),
    };
    const addSheet: MockAddSheet = {
      // header + 1 data row
      getLastRow: jest.fn(() => ADD_SHEET.HEADER_ROW + 1 + 1),
      getLastColumn: jest.fn(() => lastColAdd),
      getRange: jest.fn(() => addRange as any),
      deleteRow: jest.fn(),
    };

    (validateRow as jest.Mock).mockReturnValueOnce([]);
    const dbLastCol = DB_SHEET.NOTES + 1;

    const dbIdScanRange: MockRange = {
      getValues: jest.fn(() => [["mm.new.2"], ["mm.new.10"], ["mm.new.7"]]),
    };
    const dbWriteRange: MockRange = {
      getValues: jest.fn(),
      setValues: jest.fn(),
    };
    const dbSheet: MockDbSheet = {
      // header + 3 data rows
      getLastRow: jest.fn(() => DB_SHEET.HEADER_ROW + 1 + 3),
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
        if (name === ADD_SHEET.NAME) return addSheet as any;
        if (name === DB_SHEET.NAME) return dbSheet as any;
        return null;
      }),
    };

    (globalThis as any).SpreadsheetApp.getActive.mockReturnValue(ss);

    addMuseums();

    expect(addSheet.deleteRow).toHaveBeenCalledWith(ADD_SHEET.HEADER_ROW + 2);
    expect(dbWriteRange.setValues).toHaveBeenCalledTimes(1);
    const [[written2d]] = dbWriteRange.setValues.mock.calls as unknown[][];
    const writtenRow = (written2d as any[][])[0];
    expect(writtenRow[DB_SHEET.ID]).toBe("mm.new.11");
    expect(writtenRow[DB_SHEET.MUSEUM_NAME]).toBe("Museum A");
    expect(writtenRow[DB_SHEET.POSTCODE]).toBe("SW1A 1AA");
    expect(writtenRow[DB_SHEET.YEAR_OPENED_1]).toBe("1999");
    expect(writtenRow[DB_SHEET.YEAR_OPENED_2]).toBe("2003");
    expect(writtenRow[DB_SHEET.YEAR_CLOSED_1]).toBe("2010");
    expect(writtenRow[DB_SHEET.YEAR_CLOSED_2]).toBe("2010");
    const ui = (globalThis as any).SpreadsheetApp.getUi();
    expect(ui.alert).toHaveBeenCalledWith("Added 1 museum to Database.");
  });
});
