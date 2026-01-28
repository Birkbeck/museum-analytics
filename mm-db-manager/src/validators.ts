import {
  ACCREDITATION_VALUES,
  GOVERNANCE_VALUES,
  SIZE_VALUES,
  SUBJECT_VALUES
} from "./allowed_values";

export function is_empty(value: unknown): boolean {
    return value === null || value === undefined || String(value).trim() === "";
}

export function is_not_empty(value: unknown): boolean {
    return !is_empty(value);
}

export function is_boolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function is_valid_wikidata_id(value: unknown): boolean {
    if (typeof value !== "string") return false;
    return /^Q\d+$/.test(value.trim());
}

export function is_valid_postcode(value: unknown): boolean {
    if (typeof value !== "string") return false;
    return /^[A-Z]{1,2}\d[A-Z\d]?\s+\d[A-Z]{2}$/i.test(value.trim());
}

export function is_valid_accreditation(value: unknown): boolean {
    if (typeof value !== "string") return false;
    return ACCREDITATION_VALUES.has(value);
}

export function is_valid_accreditation_number(value: unknown): boolean {
    if (value === null || value === undefined || value === "") {
	return false;
    }
    const num =
	typeof value === "number"
	? value
	: typeof value === "string"
        ? Number(value)
        : NaN;
    return Number.isInteger(num) && num > 0;
}

export function is_valid_year_range(value: unknown): boolean {
    if (typeof value !== "string") {
	return false;
    }
    const trimmed = value.trim();
    if (!/^\d{4}(?:\/\d{4})?$/.test(trimmed)) {
	return false;
    }
    const [startStr, endStr] = trimmed.split("/");
    const start = Number(startStr);
    const end = endStr ? Number(endStr) : start;
    return start <= end;
}

export function is_valid_governance(value: unknown): boolean {
    if (typeof value !== "string") return false;
    return GOVERNANCE_VALUES.has(value);
}

export function is_valid_size(value: unknown): boolean {
    if (typeof value !== "string") return false;
    return SIZE_VALUES.has(value);
}

export function is_valid_subject(value: unknown): boolean {
    if (typeof value !== "string") return false;
    return SUBJECT_VALUES.has(value);
}
