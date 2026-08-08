import type { Result } from "./result";

type Nullable = {
	nullable?: boolean;
};

export type Schema = (
	| { type: "string" }
	| { type: "date" }
	| { type: "enum"; values: readonly unknown[] }
	| {
			type: "object";
			properties: Readonly<Record<string, Schema>>;
	  }
) &
	Nullable;

export type Infer<S extends Schema> =
	| (S extends { nullable: true } ? null : never)
	| (S extends { type: "string" }
			? string
			: S extends { type: "date" }
				? Date
				: S extends { type: "enum"; values: readonly (infer Value)[] }
					? Value
					: S extends {
								type: "object";
								properties: infer Properties;
						  }
						? {
								[
									Key in keyof Properties
								]: Properties[Key] extends Schema
									? Infer<Properties[Key]>
									: never;
							}
						: never);

export type ValidationFailureReason =
	"unexpected_null" | "type_mismatch" | "invalid_date" | "unknown_enum_value";

export type ValidationResult<S extends Schema> = Result<
	Infer<S>,
	ValidationFailureReason
>;

export const validate = <S extends Schema>(
	schema: S,
	value: unknown,
): ValidationResult<S> => validateValue(schema, value) as ValidationResult<S>;

const validateValue = (
	schema: Schema,
	value: unknown,
): Result<unknown, ValidationFailureReason> => {
	if (value === null) {
		return schema.nullable
			? { ok: true, value: null }
			: { ok: false, reason: "unexpected_null" };
	}

	switch (schema.type) {
		case "string":
			return typeof value === "string"
				? { ok: true, value }
				: { ok: false, reason: "type_mismatch" };
		case "date": {
			if (typeof value !== "string") {
				return { ok: false, reason: "type_mismatch" };
			}
			const date = new Date(value);
			return Number.isNaN(date.getTime())
				? { ok: false, reason: "invalid_date" }
				: { ok: true, value: date };
		}
		case "enum":
			return schema.values.some((candidate) => candidate === value)
				? { ok: true, value }
				: { ok: false, reason: "unknown_enum_value" };
		case "object": {
			if (typeof value !== "object" || Array.isArray(value)) {
				return { ok: false, reason: "type_mismatch" };
			}
			const validated: Record<string, unknown> = {};
			for (const key of Object.keys(schema.properties)) {
				const propertySchema = schema.properties[key];
				if (propertySchema === undefined) continue;
				const result = validateValue(
					propertySchema,
					(value as Record<string, unknown>)[key],
				);
				if (!result.ok) return result;
				validated[key] = result.value;
			}
			return { ok: true, value: validated };
		}
	}
};
