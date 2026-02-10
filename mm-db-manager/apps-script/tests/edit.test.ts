import { editMuseums } from "../src/edit";

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

describe("editMuseums (cloud API)", () => {
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
            editedCount: 1,
            errorsByRow: [],
            skippedNotReady: 0,
            message: "Edited 1 museum in Database.",
        });
        (globalThis as any).UrlFetchApp.fetch.mockReturnValue(resp);

        editMuseums();

        const ui = (globalThis as any).SpreadsheetApp.getUi();
        expect(ui.alert).toHaveBeenCalledWith("Edited 1 museum in Database.");
        const [url] = (globalThis as any).UrlFetchApp.fetch.mock.calls[0];
        expect(url).toBe("https://example.com/api/editMuseums");
    });

    test("alerts formatted errors when API returns row errors", () => {
        const resp = makeFetchResponse(200, {
            ok: true,
            editedCount: 0,
            errorsByRow: [{ row: 5, errors: ["Museum ID not found."] }],
            skippedNotReady: 0,
            message: "No valid rows marked ready to commit.",
        });
        (globalThis as any).UrlFetchApp.fetch.mockReturnValue(resp);

        editMuseums();

        const ui = (globalThis as any).SpreadsheetApp.getUi();
        const msg = ui.alert.mock.calls[0][0];
        expect(msg).toContain("Row 5");
        expect(msg).toContain("Museum ID not found.");
    });

    test("alerts error when API returns HTTP error", () => {
        const resp = makeFetchResponse(401, {
            ok: false,
            error: "Unauthorized",
        });
        (globalThis as any).UrlFetchApp.fetch.mockReturnValue(resp);

        editMuseums();

        const ui = (globalThis as any).SpreadsheetApp.getUi();
        const msg = ui.alert.mock.calls[0][0];
        expect(msg).toContain("Edit failed.");
        expect(msg).toContain("Unauthorized");
    });
});
