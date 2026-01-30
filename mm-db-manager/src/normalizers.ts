export function asTrimmedString(v: unknown): string {
    return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

export function getBroadType(value: unknown): string {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    const [broad] = trimmed.split(":");
    return broad.trim();
}

export function splitYearRange(value: unknown): [string, string] {
    if (typeof value !== "string") return ["", ""];
    const trimmed = value.trim();
    if (!trimmed) return ["", ""];
    const [start, end] = trimmed.split("/");
    return [start, end ?? start];
}
