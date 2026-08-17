import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { durationMinutesSchema, minutesSchema, secondsSchema } from "./time";

describe("minutesSchema", () => {
	it.each([
		{ input: 0, expected: 0 },
		{ input: "25", expected: 25 },
	])("should parse minutes: $input", ({ input, expected }) => {
		expect(v.parse(minutesSchema, input)).toBe(expected);
	});

	it.each([{ input: 600 }, { input: -1 }])(
		"should reject out-of-range minutes: $input",
		({ input }) => {
			expect(() => v.parse(minutesSchema, input)).toThrow(
				"Enter fewer than 600 minutes.",
			);
		},
	);
});

describe("secondsSchema", () => {
	it.each([
		{ input: 0, expected: 0 },
		{ input: "59", expected: 59 },
	])("should parse seconds: $input", ({ input, expected }) => {
		expect(v.parse(secondsSchema, input)).toBe(expected);
	});

	it.each([{ input: 60 }, { input: "60" }, { input: -1 }])(
		"should reject out-of-range seconds: $input",
		({ input }) => {
			expect(() => v.parse(secondsSchema, input)).toThrow(
				"Enter fewer than 60 seconds.",
			);
		},
	);

	it("should reject a non-integer", () => {
		expect(() => v.parse(secondsSchema, 1.5)).toThrow(
			"Enter a whole number.",
		);
	});
});

describe("durationMinutesSchema", () => {
	it("should parse a positive duration", () => {
		expect(v.parse(durationMinutesSchema, "25")).toBe(25);
	});

	it.each([{ input: 0 }, { input: -1 }])(
		"should reject a non-positive duration: $input",
		({ input }) => {
			expect(() => v.parse(durationMinutesSchema, input)).toThrow(
				"Enter a positive whole number.",
			);
		},
	);

	it("should reject a duration over the upper bound", () => {
		expect(() => v.parse(durationMinutesSchema, 600)).toThrow(
			"Enter fewer than 600 minutes.",
		);
	});

	it("should reject a value that is not a number", () => {
		expect(() => v.parse(durationMinutesSchema, "abc")).toThrow(
			"Enter a number.",
		);
	});
});
