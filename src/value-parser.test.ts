import { describe, expect, it } from "vitest";
import { parsePositiveInteger } from "./value-parser";

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
