import { describe, expect, it } from "vitest";
import * as v from "valibot";
import {
	durationMinutesReason,
	durationMinutesSchema,
	minutesSchema,
	secondsSchema,
} from "./time";

describe("minutesSchema", () => {
	it.each([
		{ input: 0, expected: 0 },
		{ input: "25", expected: 25 },
	])("should parse minutes: $input", ({ input, expected }) => {
		expect(v.parse(minutesSchema, input)).toBe(expected);
	});

	it.each([{ input: 600 }, { input: -1 }, { input: 1.5 }, { input: "abc" }])(
		"should reject minutes: $input",
		({ input }) => {
			expect(v.safeParse(minutesSchema, input).success).toBe(false);
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

	it.each([{ input: 60 }, { input: "60" }, { input: -1 }, { input: 1.5 }])(
		"should reject seconds: $input",
		({ input }) => {
			expect(v.safeParse(secondsSchema, input).success).toBe(false);
		},
	);
});

describe("durationMinutesSchema", () => {
	it("should parse a positive duration", () => {
		expect(v.parse(durationMinutesSchema, "25")).toBe(25);
	});

	it.each([
		{ input: "abc", expected: "invalid_number" },
		{ input: Number.POSITIVE_INFINITY, expected: "invalid_number" },
		{ input: 1.5, expected: "non_integer" },
		{ input: 0, expected: "non_positive_integer" },
		{ input: -1, expected: "non_positive_integer" },
		{ input: 600, expected: "out_of_range_minutes" },
	])("should report $expected for $input", ({ input, expected }) => {
		const result = v.safeParse(durationMinutesSchema, input);
		if (result.success) throw new Error("expected a failure");

		expect(durationMinutesReason(result.issues[0])).toBe(expected);
	});
});
