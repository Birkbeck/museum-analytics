import { restoreMuseums } from "../src/restore";

type FetchResponse = {
    getResponseCode: jest.Mock;
    getContentText: jest.Mock;
};

function makeUi() {
    return { alert: jest.fn() };
}

function makeFetchResponse(status: number, body: unknown): FetchResponse {
    return {
        getResponseCode: jest.fn(() => status),
        getContentText: jest.fn(() => JSON.stringify(body)),
    };
}

describe("restoreMuseums (cloud API)", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        const ui = makeUi();
        (globalThis as any).SpreadsheetApp = {
            getUi: jest.fn(() => ui),
        };
        (globalThis as any).PropertiesService = {
            getScriptProperties: () => ({
                getProperty: jest.fn((key: string) => {
                    if (key === "MM_DB_CLOUD_API_BASE_URL") return "https://example.com/api";
                    if (key === "MM_DB_CLOUD_API_HMAC_SECRET") return null;
                    return null;
                }),
            }),
        };
        (globalThis as any).UrlFetchApp = {
            fetch: jest.fn(),
        };
    });

    test("alerts success message from API", () => {
        const resp = makeFetchResponse(200, {
            ok: true,
            restoredCount: 1,
            errorsByRow: [],
            skippedNotReady: 0,
            message: "Restored 1 museum to Database.",
        });
        (globalThis as any).UrlFetchApp.fetch.mockReturnValue(resp);

        restoreMuseums();

        const ui = (globalThis as any).SpreadsheetApp.getUi();
        expect(ui.alert).toHaveBeenCalledWith("Restored 1 museum to Database.");
        const [url] = (globalThis as any).UrlFetchApp.fetch.mock.calls[0];
        expect(url).toBe("https://example.com/api/restoreMuseums");
    });

    test("alerts formatted errors when API returns row errors", () => {
        const resp = makeFetchResponse(200, {
            ok: true,
            restoredCount: 0,
            errorsByRow: [{ row: 2, errors: ["Trash row is missing a Museum ID."] }],
            skippedNotReady: 0,
            message: "No valid rows marked ready to restore.",
        });
        (globalThis as any).UrlFetchApp.fetch.mockReturnValue(resp);

        restoreMuseums();

        const ui = (globalThis as any).SpreadsheetApp.getUi();
        const msg = ui.alert.mock.calls[0][0];
        expect(msg).toContain("Row 2");
        expect(msg).toContain("Trash row is missing a Museum ID.");
    });

    test("alerts error when API returns HTTP error", () => {
        const resp = makeFetchResponse(500, {
            ok: false,
            error: "Internal error",
        });
        (globalThis as any).UrlFetchApp.fetch.mockReturnValue(resp);

        restoreMuseums();

        const ui = (globalThis as any).SpreadsheetApp.getUi();
        const msg = ui.alert.mock.calls[0][0];
        expect(msg).toContain("Restore failed.");
        expect(msg).toContain("Internal error");
    });
});
