import fc from "fast-check";
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

const totalSecondsUpperBound = t.minutesUpperBound * t.secondsUpperBound;

describe("fromSeconds", () => {
	it("should break a non-negative second count into minutes and seconds", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 0, max: totalSecondsUpperBound - 1 }),
				(seconds) => {
					expect(t.fromSeconds(seconds)).toEqual({
						minutes: Math.floor(seconds / 60),
						seconds: seconds % 60,
						sign: 1,
					});
				},
			),
		);
	});

	it("should break a negative second count into minutes and seconds", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: totalSecondsUpperBound - 1 }),
				(seconds) => {
					expect(t.fromSeconds(-seconds)).toEqual({
						minutes: Math.floor(seconds / 60),
						seconds: seconds % 60,
						sign: -1,
					});
				},
			),
		);
	});

	it("should return null once minutes overflow, in either direction", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: totalSecondsUpperBound, max: 10_000_000 }),
				fc.constantFrom(1, -1),
				(magnitude, sign) => {
					expect(t.fromSeconds(magnitude * sign)).toBeNull();
				},
			),
		);
	});
});

describe("isNegative", () => {
	it("should identify the sign", () => {
		expect(t.isNegative(t.time(7, 5))).toBe(false);
		expect(t.isNegative(t.neg(t.time(7, 5)))).toBe(true);
	});
});

describe("parseMinutes", () => {
	it("should parse every in-range integer, as a number or a numeric string", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 0, max: t.minutesUpperBound - 1 }),
				(minutes) => {
					expect(t.parseMinutes(minutes)).toBe(minutes);
					expect(t.parseMinutes(String(minutes))).toBe(minutes);
				},
			),
		);
	});

	it("should reject out-of-range or non-integer numbers", () => {
		fc.assert(
			fc.property(
				fc.oneof(
					fc.integer({ max: -1 }),
					fc.integer({ min: t.minutesUpperBound }),
					fc
						.double({ noNaN: true })
						.filter((value) => !Number.isInteger(value)),
				),
				(value) => {
					expect(t.parseMinutes(value)).toBeNull();
				},
			),
		);
	});

	it("should reject non-numeric strings", () => {
		expect(t.parseMinutes("abc")).toBeNull();
	});
});

describe("parseSeconds", () => {
	it("should parse every in-range integer, as a number or a numeric string", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 0, max: t.secondsUpperBound - 1 }),
				(seconds) => {
					expect(t.parseSeconds(seconds)).toBe(seconds);
					expect(t.parseSeconds(String(seconds))).toBe(seconds);
				},
			),
		);
	});

	it("should reject out-of-range or non-integer numbers", () => {
		fc.assert(
			fc.property(
				fc.oneof(
					fc.integer({ max: -1 }),
					fc.integer({ min: t.secondsUpperBound }),
					fc
						.double({ noNaN: true })
						.filter((value) => !Number.isInteger(value)),
				),
				(value) => {
					expect(t.parseSeconds(value)).toBeNull();
				},
			),
		);
	});

	it("should reject non-numeric strings", () => {
		expect(t.parseSeconds("abc")).toBeNull();
	});
});

describe("parseDurationMinutes", () => {
	it("should parse every in-range positive integer, as a number or a numeric string", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: t.minutesUpperBound - 1 }),
				(minutes) => {
					expect(t.parseDurationMinutes(minutes)).toEqual({
						ok: true,
						value: minutes,
					});
					expect(t.parseDurationMinutes(String(minutes))).toEqual({
						ok: true,
						value: minutes,
					});
				},
			),
		);
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
