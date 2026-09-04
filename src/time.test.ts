import { describe, expect, expectTypeOf, it } from "vitest";
import * as t from "./time";

describe("Time", () => {
	it("should allow positive zero", () => {
		const zero = { minutes: 0, seconds: 0, sign: 1 } as const;

		expectTypeOf(zero).toExtend<t.Time>();
		expectTypeOf(t.time(0, 0)).not.toExtend<Parameters<typeof t.neg>[0]>();
		expect(zero).toEqual({ minutes: 0, seconds: 0, sign: 1 });
	});

	it("should reject negative zero", () => {
		const negativeZero = {
			minutes: 0,
			seconds: 0,
			sign: -1,
		} as const;

		expectTypeOf(negativeZero).not.toExtend<t.Time>();
		expect(negativeZero.sign).toBe(-1);
	});
});

describe("toSeconds", () => {
	it("should return positive seconds", () => {
		expect(t.toSeconds(t.time(7, 5))).toBe(425);
	});

	it("should return negative seconds for overtime", () => {
		expect(t.toSeconds(t.neg(t.time(7, 5)))).toBe(-425);
	});
});

describe("fromSeconds", () => {
	it("should return a positive Time", () => {
		expect(t.fromSeconds(425)).toEqual(t.time(7, 5));
	});

	it("should return a negative Time for overtime", () => {
		expect(t.fromSeconds(-425)).toEqual(t.neg(t.time(7, 5)));
	});

	it("should return null when minutes overflow", () => {
		expect(t.fromSeconds(600 * 60)).toBeNull();
	});

	it("should return null when negative minutes overflow", () => {
		expect(t.fromSeconds(-600 * 60)).toBeNull();
	});
});

describe("isNegative", () => {
	it("should identify the sign", () => {
		expect(t.isNegative(t.time(7, 5))).toBe(false);
		expect(t.isNegative(t.neg(t.time(7, 5)))).toBe(true);
	});
});

describe("parseMinutes", () => {
	it.each([
		{ input: 0, expected: 0 },
		{ input: "25", expected: 25 },
	])("should parse minutes: $input", ({ input, expected }) => {
		expect(t.parseMinutes(input)).toBe(expected);
	});

	it.each([{ input: 600 }, { input: -1 }, { input: 1.5 }, { input: "abc" }])(
		"should reject minutes: $input",
		({ input }) => {
			expect(t.parseMinutes(input)).toBeNull();
		},
	);
});

describe("parseSeconds", () => {
	it.each([
		{ input: 0, expected: 0 },
		{ input: "59", expected: 59 },
	])("should parse seconds: $input", ({ input, expected }) => {
		expect(t.parseSeconds(input)).toBe(expected);
	});

	it.each([{ input: 60 }, { input: "60" }, { input: -1 }, { input: 1.5 }])(
		"should reject seconds: $input",
		({ input }) => {
			expect(t.parseSeconds(input)).toBeNull();
		},
	);
});

describe("parseDurationMinutes", () => {
	it("should parse a positive duration", () => {
		expect(t.parseDurationMinutes("25")).toEqual({
			ok: true,
			value: 25,
		});
	});

	it.each([
		{ input: "abc", expected: "invalid_number" },
		{ input: Number.POSITIVE_INFINITY, expected: "invalid_number" },
		{ input: 1.5, expected: "non_integer" },
		{ input: 0, expected: "non_positive_integer" },
		{ input: -1, expected: "non_positive_integer" },
		{ input: 600, expected: "out_of_range_minutes" },
	])("should report $expected for $input", ({ input, expected }) => {
		expect(t.parseDurationMinutes(input)).toEqual({
			ok: false,
			reason: expected,
		});
	});
});
