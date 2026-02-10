import { trashMuseums } from "../src/trash";

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

describe("trashMuseums (cloud API)", () => {
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
            trashedCount: 3,
            errorsByRow: [],
            skippedNotReady: 0,
            message: "Moved 3 museums to Trash.",
        });
        (globalThis as any).UrlFetchApp.fetch.mockReturnValue(resp);

        trashMuseums();

        const ui = (globalThis as any).SpreadsheetApp.getUi();
        expect(ui.alert).toHaveBeenCalledWith("Moved 3 museums to Trash.");
        const [url] = (globalThis as any).UrlFetchApp.fetch.mock.calls[0];
        expect(url).toBe("https://example.com/api/trashMuseums");
    });

    test("alerts formatted errors when API returns row errors", () => {
        const resp = makeFetchResponse(200, {
            ok: true,
            trashedCount: 1,
            errorsByRow: [{ row: 4, errors: ["Museum ID not found."] }],
            skippedNotReady: 0,
            message: "Moved 1 museum to Trash.",
        });
        (globalThis as any).UrlFetchApp.fetch.mockReturnValue(resp);

        trashMuseums();

        const ui = (globalThis as any).SpreadsheetApp.getUi();
        const msg = ui.alert.mock.calls[0][0];
        expect(msg).toContain("Row 4");
        expect(msg).toContain("Museum ID not found.");
    });

    test("alerts error when API returns HTTP error", () => {
        const resp = makeFetchResponse(403, {
            ok: false,
            error: "Forbidden",
        });
        (globalThis as any).UrlFetchApp.fetch.mockReturnValue(resp);

        trashMuseums();

        const ui = (globalThis as any).SpreadsheetApp.getUi();
        const msg = ui.alert.mock.calls[0][0];
        expect(msg).toContain("Trash failed.");
        expect(msg).toContain("Forbidden");
    });
});
