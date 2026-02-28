//
// General Types
//

export type ParseResult<T, R extends string> =
	| { ok: true; value: T }
	| { ok: false; reason: R };

//
// Positive Integer Parser
//

export type ParsePositiveIntegerResult = ParseResult<
	number,
	"invalid_number" | "non_positive_integer"
>;

export function parsePositiveInteger(
	value: unknown,
): ParsePositiveIntegerResult {
	const parsed =
		typeof value === "number"
			? value
			: typeof value === "string"
				? Number(value)
				: Number.NaN;
	if (Number.isNaN(parsed)) {
		return { ok: false, reason: "invalid_number" };
	}
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return { ok: false, reason: "non_positive_integer" };
	}
	return { ok: true, value: parsed };
}
