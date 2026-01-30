import { DB_SHEET, NEW_ID_SHEET } from "./config";
import { withDocumentLock } from "./lock";

/**
 * Allocates a new museum ID of the form:
 *   mm.new.<n>
 *
 * This uses NEW_ID_SHEET.LAST_ID as the single source of truth.
 *
 * The cell stores the *last issued numeric suffix* (e.g. 10 => next is 11).
 * The update happens inside a document lock to guarantee uniqueness.
 */
export function allocateNextMuseumId(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet
): string {
  return withDocumentLock(() => {
    const idSheet = ss.getSheetByName(NEW_ID_SHEET.NAME);
    if (!idSheet) throw new Error(`Missing sheet: ${NEW_ID_SHEET.NAME}`);

    const cell = idSheet.getRange(NEW_ID_SHEET.LAST_ID);
    const raw = cell.getValue();

    const lastIssued = parseCounterCell(raw);
    const next = lastIssued + 1;

    cell.setValue(next);

    return `mm.new.${next}`;
  });
}

function parseCounterCell(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (s === "") return 0;
    const n = Number(s);
    if (Number.isFinite(n) && Number.isInteger(n) && n >= 0) return n;
  }
  if (value === null || value === undefined || value === "") return 0;
  throw new Error(
    `Invalid NEW_ID_SHEET counter value: "${String(value)}" (expected non-negative integer)`
  );
}
