import { addMuseums } from "../src/add";

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

describe("addMuseums (cloud API)", () => {
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
            addedCount: 2,
            errorsByRow: [],
            skippedNotReady: 0,
            message: "Added 2 museums to Database.",
        });
        (globalThis as any).UrlFetchApp.fetch.mockReturnValue(resp);

        addMuseums();

        const ui = (globalThis as any).SpreadsheetApp.getUi();
        expect(ui.alert).toHaveBeenCalledWith("Added 2 museums to Database.");
        expect((globalThis as any).UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        const [url, options] = (globalThis as any).UrlFetchApp.fetch.mock.calls[0];
        expect(url).toBe("https://example.com/api/addMuseums");
        expect(options.method).toBe("post");
        expect(options.contentType).toBe("application/json");
    });

    test("alerts formatted errors when API returns row errors", () => {
        const resp = makeFetchResponse(200, {
            ok: true,
            addedCount: 1,
            errorsByRow: [{ row: 3, errors: ["Museum must have a name."] }],
            skippedNotReady: 0,
            message: "Added 1 museum to Database.",
        });
        (globalThis as any).UrlFetchApp.fetch.mockReturnValue(resp);

        addMuseums();

        const ui = (globalThis as any).SpreadsheetApp.getUi();
        const msg = ui.alert.mock.calls[0][0];
        expect(msg).toContain("Row 3");
        expect(msg).toContain("Museum must have a name.");
    });

    test("alerts error when API returns HTTP error", () => {
        const resp = makeFetchResponse(500, {
            ok: false,
            error: "Internal error",
            details: { exception: "boom" },
        });
        (globalThis as any).UrlFetchApp.fetch.mockReturnValue(resp);

        addMuseums();

        const ui = (globalThis as any).SpreadsheetApp.getUi();
        const msg = ui.alert.mock.calls[0][0];
        expect(msg).toContain("Add failed.");
        expect(msg).toContain("Internal error");
    });
});
