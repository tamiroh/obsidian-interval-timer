import { describe, expect, it } from "vitest";
import {
	ensureMinutes,
	ensureSeconds,
	toTotalMilliseconds,
	toTotalSeconds,
} from "./time";

describe("ensureMinutes", () => {
	it("should return the value when it is a non-negative integer", () => {
		expect(ensureMinutes(0)).toBe(0);
		expect(ensureMinutes(25)).toBe(25);
	});

	it("should throw when value is negative", () => {
		expect(() => ensureMinutes(-1)).toThrow(RangeError);
	});

	it("should throw when value is not an integer", () => {
		expect(() => ensureMinutes(1.5)).toThrow(RangeError);
	});

	it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
		"should throw when value is not a finite number: %p",
		(value) => {
			expect(() => ensureMinutes(value)).toThrow(RangeError);
		},
	);
});

describe("ensureSeconds", () => {
	it("should return the value when it is between 0 and 59", () => {
		expect(ensureSeconds(0)).toBe(0);
		expect(ensureSeconds(59)).toBe(59);
	});

	it("should throw when value is out of range", () => {
		expect(() => ensureSeconds(-1)).toThrow(RangeError);
		expect(() => ensureSeconds(60)).toThrow(RangeError);
	});

	it("should throw when value is not an integer", () => {
		expect(() => ensureSeconds(0.5)).toThrow(RangeError);
	});

	it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
		"should throw when value is not a finite number: %p",
		(value) => {
			expect(() => ensureSeconds(value)).toThrow(RangeError);
		},
	);
});

describe("toTotalSeconds", () => {
	it.each([
		{ minutes: 0, seconds: 0, expected: 0 },
		{ minutes: 0, seconds: 59, expected: 59 },
		{ minutes: 1, seconds: 0, expected: 60 },
		{ minutes: 2, seconds: 5, expected: 125 },
		{ minutes: 25, seconds: 30, expected: 1530 },
	])(
		"should convert $minutes:$seconds to $expected total seconds",
		({ minutes, seconds, expected }) => {
			expect(
				toTotalSeconds({
					minutes: ensureMinutes(minutes),
					seconds: ensureSeconds(seconds),
				}),
			).toBe(expected);
		},
	);
});

describe("toTotalMilliseconds", () => {
	it.each([
		{ minutes: 0, seconds: 0, expected: 0 },
		{ minutes: 0, seconds: 1, expected: 1000 },
		{ minutes: 0, seconds: 59, expected: 59000 },
		{ minutes: 1, seconds: 30, expected: 90000 },
		{ minutes: 25, seconds: 30, expected: 1530000 },
	])(
		"should convert $minutes:$seconds to $expected milliseconds",
		({ minutes, seconds, expected }) => {
			expect(
				toTotalMilliseconds({
					minutes: ensureMinutes(minutes),
					seconds: ensureSeconds(seconds),
				}),
			).toBe(expected);
		},
	);
});
