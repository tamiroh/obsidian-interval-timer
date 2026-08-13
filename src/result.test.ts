import { describe, expect, it } from "vitest";
import { err, ok } from "./result";

describe("ok", () => {
	it("should return an ok result with no value when called with no arguments", () => {
		expect(ok()).toStrictEqual({ ok: true, value: undefined });
	});

	it.each([{ input: 42 }, { input: "text" }, { input: null }])(
		"should return an ok result wrapping the given value: $input",
		({ input }) => {
			expect(ok(input)).toStrictEqual({ ok: true, value: input });
		},
	);
});

describe("err", () => {
	it("should return a failure result with the given reason", () => {
		expect(err("some_reason")).toStrictEqual({
			ok: false,
			reason: "some_reason",
		});
	});
});
