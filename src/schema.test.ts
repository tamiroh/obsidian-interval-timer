import { describe, expect, it } from "vitest";
import { validate, type Schema } from "./schema";

describe("validate", () => {
	describe("string", () => {
		const schema = { type: "string" } as const satisfies Schema;

		it("should accept a string", () => {
			expect(validate(schema, "hello")).toStrictEqual({
				ok: true,
				value: "hello",
			});
		});

		it("should reject a non-string", () => {
			expect(validate(schema, 42)).toStrictEqual({
				ok: false,
				reason: "type_mismatch",
			});
		});
	});

	describe("date", () => {
		const schema = { type: "date" } as const satisfies Schema;

		it("should accept an ISO date string", () => {
			const result = validate(schema, "2024-01-01T00:00:00.000Z");

			expect(result.ok).toBe(true);
			expect(result.ok && result.value).toStrictEqual(
				new Date("2024-01-01T00:00:00.000Z"),
			);
		});

		it("should reject a non-string", () => {
			expect(validate(schema, 1704067200000)).toStrictEqual({
				ok: false,
				reason: "type_mismatch",
			});
		});

		it("should reject an unparsable date string", () => {
			expect(validate(schema, "not-a-date")).toStrictEqual({
				ok: false,
				reason: "invalid_date",
			});
		});
	});

	describe("enum", () => {
		const schema = {
			type: "enum",
			values: ["focus", "shortBreak"],
		} as const satisfies Schema;

		it("should accept a listed value", () => {
			expect(validate(schema, "focus")).toStrictEqual({
				ok: true,
				value: "focus",
			});
		});

		it("should reject an unlisted value", () => {
			expect(validate(schema, "longBreak")).toStrictEqual({
				ok: false,
				reason: "unknown_enum_value",
			});
		});
	});

	describe("object", () => {
		const schema = {
			type: "object",
			properties: {
				name: { type: "string" },
				state: { type: "enum", values: ["focus", "shortBreak"] },
			},
		} as const satisfies Schema;

		it("should accept a matching object", () => {
			expect(
				validate(schema, { name: "task", state: "focus" }),
			).toStrictEqual({
				ok: true,
				value: { name: "task", state: "focus" },
			});
		});

		it("should ignore properties not declared in the schema", () => {
			expect(
				validate(schema, {
					name: "task",
					state: "focus",
					extra: "ignored",
				}),
			).toStrictEqual({
				ok: true,
				value: { name: "task", state: "focus" },
			});
		});

		it("should reject a non-object", () => {
			expect(validate(schema, "not-an-object")).toStrictEqual({
				ok: false,
				reason: "type_mismatch",
			});
		});

		it("should reject an array", () => {
			expect(validate(schema, [])).toStrictEqual({
				ok: false,
				reason: "type_mismatch",
			});
		});

		it("should propagate a nested property's failure", () => {
			expect(
				validate(schema, { name: "task", state: "longBreak" }),
			).toStrictEqual({
				ok: false,
				reason: "unknown_enum_value",
			});
		});
	});

	describe("nullable", () => {
		const schema = {
			type: "string",
			nullable: true,
		} as const satisfies Schema;

		it("should accept null when nullable", () => {
			expect(validate(schema, null)).toStrictEqual({
				ok: true,
				value: null,
			});
		});

		it("should reject null when not nullable", () => {
			const nonNullableSchema = {
				type: "string",
			} as const satisfies Schema;

			expect(validate(nonNullableSchema, null)).toStrictEqual({
				ok: false,
				reason: "unexpected_null",
			});
		});
	});
});
