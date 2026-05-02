import { describe, expect, it } from "vitest";
import {
	parseMinutes,
	parseNonNegativeInteger,
	parsePositiveInteger,
	parseSeconds,
} from "./value-parser";

describe("parsePositiveInteger", () => {
	it.each([
		{ input: 25, expected: 25 },
		{ input: "42", expected: 42 },
	])("should parse positive integer: $input", ({ input, expected }) => {
		expect(parsePositiveInteger(input)).toStrictEqual({
			ok: true,
			value: expected,
		});
	});

	it.each([{ input: "abc" }, { input: null }])(
		"should return invalid_number: $input",
		({ input }) => {
			expect(parsePositiveInteger(input)).toStrictEqual({
				ok: false,
				reason: "invalid_number",
			});
		},
	);

	it.each([{ input: 0 }, { input: -1 }, { input: 1.5 }])(
		"should return non_positive_integer: $input",
		({ input }) => {
			expect(parsePositiveInteger(input)).toStrictEqual({
				ok: false,
				reason: "non_positive_integer",
			});
		},
	);
});

describe("parseNonNegativeInteger", () => {
	it.each([
		{ input: 0, expected: 0 },
		{ input: 25, expected: 25 },
		{ input: "42", expected: 42 },
	])("should parse non-negative integer: $input", ({ input, expected }) => {
		expect(parseNonNegativeInteger(input)).toStrictEqual({
			ok: true,
			value: expected,
		});
	});

	it.each([{ input: "abc" }, { input: null }])(
		"should return invalid_number: $input",
		({ input }) => {
			expect(parseNonNegativeInteger(input)).toStrictEqual({
				ok: false,
				reason: "invalid_number",
			});
		},
	);

	it("should return negative_integer", () => {
		expect(parseNonNegativeInteger(-1)).toStrictEqual({
			ok: false,
			reason: "negative_integer",
		});
	});

	it("should return non_integer", () => {
		expect(parseNonNegativeInteger(1.5)).toStrictEqual({
			ok: false,
			reason: "non_integer",
		});
	});
});

describe("parseMinutes", () => {
	it.each([
		{ input: 0, expected: 0 },
		{ input: "25", expected: 25 },
	])("should parse minutes: $input", ({ input, expected }) => {
		expect(parseMinutes(input)).toStrictEqual({
			ok: true,
			value: expected,
		});
	});
});

describe("parseSeconds", () => {
	it.each([
		{ input: 0, expected: 0 },
		{ input: "59", expected: 59 },
	])("should parse seconds: $input", ({ input, expected }) => {
		expect(parseSeconds(input)).toStrictEqual({
			ok: true,
			value: expected,
		});
	});

	it.each([{ input: 60 }, { input: "60" }])(
		"should return out_of_range_seconds: $input",
		({ input }) => {
			expect(parseSeconds(input)).toStrictEqual({
				ok: false,
				reason: "out_of_range_seconds",
			});
		},
	);

	it("should return negative_integer", () => {
		expect(parseSeconds(-1)).toStrictEqual({
			ok: false,
			reason: "negative_integer",
		});
	});

	it("should return non_integer", () => {
		expect(parseSeconds(1.5)).toStrictEqual({
			ok: false,
			reason: "non_integer",
		});
	});
});
