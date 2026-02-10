import { permanentlyDeleteMuseums } from "../src/permanently-delete";

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

describe("permanentlyDeleteMuseums (cloud API)", () => {
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
            deletedCount: 4,
            errorsByRow: [],
            skippedNotMarked: 0,
            message: "Permanently deleted 4 museums.",
        });
        (globalThis as any).UrlFetchApp.fetch.mockReturnValue(resp);

        permanentlyDeleteMuseums();

        const ui = (globalThis as any).SpreadsheetApp.getUi();
        expect(ui.alert).toHaveBeenCalledWith("Permanently deleted 4 museums.");
        const [url] = (globalThis as any).UrlFetchApp.fetch.mock.calls[0];
        expect(url).toBe("https://example.com/api/permanentlyDeleteMuseums");
    });

    test("alerts formatted errors when API returns row errors", () => {
        const resp = makeFetchResponse(200, {
            ok: true,
            deletedCount: 1,
            errorsByRow: [{ row: 6, errors: ["Failed to permanently delete row."] }],
            skippedNotMarked: 0,
            message: "Permanently deleted 1 museum.",
        });
        (globalThis as any).UrlFetchApp.fetch.mockReturnValue(resp);

        permanentlyDeleteMuseums();

        const ui = (globalThis as any).SpreadsheetApp.getUi();
        const msg = ui.alert.mock.calls[0][0];
        expect(msg).toContain("Row 6");
        expect(msg).toContain("Failed to permanently delete row.");
    });

    test("alerts error when API returns HTTP error", () => {
        const resp = makeFetchResponse(400, {
            ok: false,
            error: "Bad request",
        });
        (globalThis as any).UrlFetchApp.fetch.mockReturnValue(resp);

        permanentlyDeleteMuseums();

        const ui = (globalThis as any).SpreadsheetApp.getUi();
        const msg = ui.alert.mock.calls[0][0];
        expect(msg).toContain("Permanent delete failed.");
        expect(msg).toContain("Bad request");
    });
});
