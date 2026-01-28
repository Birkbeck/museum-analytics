import {
    is_empty,
    is_not_empty,
    is_boolean,
    is_valid_wikidata_id,
    is_valid_postcode,
    is_valid_accreditation,
    is_valid_accreditation_number,
    is_valid_year_range,
    is_valid_governance,
    is_valid_size,
    is_valid_subject
} from "../src/validators";
import {
    ACCREDITATION_VALUES,
    GOVERNANCE_VALUES,
    SIZE_VALUES,
    SUBJECT_VALUES
} from "../src/allowed_values";

function firstOf<T>(set: ReadonlySet<T>): T {
    const v = set.values().next().value as T | undefined;
    if (v === undefined) {
	throw new Error("Test requires the Set to contain at least one value.");
    }
    return v;
}

describe("is_empty / is_not_empty", () => {
    test.each([
	[null],
	[undefined],
	[""],
	["   "],
	["\n\t "],
    ])("is_empty(%p) is true", (v) => {
	expect(is_empty(v)).toBe(true);
    });
    
    test.each([
	["a"],
	["  a  "],
	[0],
	[123],
	[false],
	[true],
	[new Date()],
	[["x"]],
	[{ a: 1 }],
    ])("is_empty(%p) is false", (v) => {
	expect(is_empty(v)).toBe(false);
    });
    
    test("is_not_empty is the negation of is_empty", () => {
	const samples: unknown[] = [null, undefined, "", " ", "x", 0, false, true];
	for (const s of samples) {
	    expect(is_not_empty(s)).toBe(!is_empty(s));
	}
    });
});

describe("is_boolean", () => {
    test.each([[true], [false]])("is_boolean(%p) is true", (v) => {
	expect(is_boolean(v)).toBe(true);
    });
    
    test.each([
	[""],
	["TRUE"],
	["FALSE"],
	[0],
	[1],
	[null],
	[undefined],
	[{}],
	[new Date()],
    ])("is_boolean(%p) is false", (v) => {
	expect(is_boolean(v)).toBe(false);
    });
});

describe("is_valid_wikidata_id", () => {
    test.each([
	["Q1"],
	["Q42"],
	["Q42 "],
	["Q1234567890"],
	["  Q123  "],
    ])("accepts %p", (v) => {
	expect(is_valid_wikidata_id(v)).toBe(true);
    });
    
    test.each([
	["Q"],
	["q42"],
	["Q-1"],
	["Q 42"],
	["Q42a"],
	[42],
	[null],
	[undefined],
    ])("rejects %p", (v) => {
	expect(is_valid_wikidata_id(v)).toBe(false);
    });
});

describe("is_valid_postcode (UK, requires space)", () => {
    test.each([
	["SW1A 1AA"],
	["sw1a 1aa"],
	["M1 1AE"],
	["EC1V 9LB"],
	["W1A 0AX"],
	["B33 8TH"],
	["  B33 8TH  "],
    ])("accepts %p", (v) => {
	expect(is_valid_postcode(v)).toBe(true);
    });
    
    test.each([
	["SW1A1AA"],
	["EC1V9LB"],
	["B338TH"],
	["INVALID"],
	["123 456"],
	[""],
	["   "],
	[null],
	[undefined],
	[123],
    ])("rejects %p", (v) => {
	expect(is_valid_postcode(v)).toBe(false);
    });
});

describe("is_valid_accreditation_number", () => {
    test.each([
	[1],
	[123],
	["1"],
	["00123"],
	[" 42 "],
    ])("accepts %p", (v) => {
	expect(is_valid_accreditation_number(v)).toBe(true);
    });
    
    test.each([
	[0],
	[-1],
	["0"],
	["-2"],
	["12.3"],
	[12.3],
	["12A"],
	[""],
	["   "],
	[null],
	[undefined],
	[true],
	[false],
    ])("rejects %p", (v) => {
	expect(is_valid_accreditation_number(v)).toBe(false);
    });
});

describe("is_valid_year_range", () => {
    test.each([
	["1999"],
	["0000"],
	["1999/2000"],
	["2020/2020"],
	[" 2001/2002 "],
    ])("accepts %p", (v) => {
	expect(is_valid_year_range(v)).toBe(true);
    });
    
    test.each([
	["1999/1998"],
	["199"],
	["19999"],
	["1999/20"],
	["1999 / 2000"],
	["1999-2000"],
	["1999:2000"],
	["abcd"],
	[1999],
	[null],
	[undefined],
    ])("rejects %p", (v) => {
	expect(is_valid_year_range(v)).toBe(false);
    });
});

describe("Set-based validators (accreditation/governance/size/subject)", () => {
    test("is_valid_accreditation accepts a known allowed value", () => {
	const allowed = firstOf(ACCREDITATION_VALUES);
	expect(is_valid_accreditation(allowed)).toBe(true);
    });
    
    test("is_valid_governance accepts a known allowed value", () => {
	const allowed = firstOf(GOVERNANCE_VALUES);
	expect(is_valid_governance(allowed)).toBe(true);
    });
    
    test("is_valid_size accepts a known allowed value", () => {
	const allowed = firstOf(SIZE_VALUES);
	expect(is_valid_size(allowed)).toBe(true);
    });
    
    test("is_valid_subject accepts a known allowed value", () => {
	const allowed = firstOf(SUBJECT_VALUES);
	expect(is_valid_subject(allowed)).toBe(true);
    });
    
    test.each([
	["DefinitelyNotARealAllowedValue"],
	[""],
	["   "],
	[null],
	[undefined],
	[123],
	[true],
    ])("all Set-based validators reject %p", (v) => {
	expect(is_valid_accreditation(v)).toBe(false);
	expect(is_valid_governance(v)).toBe(false);
	expect(is_valid_size(v)).toBe(false);
	expect(is_valid_subject(v)).toBe(false);
    });
});
