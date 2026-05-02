import { isSeconds, type Minutes, type Seconds } from "./time";

//
// General Types
//

export type ParseResult<T, R extends string> =
	| { ok: true; value: T }
	| { ok: false; reason: R };

type ParseFailureReason<T extends ParseResult<unknown, string>> = Extract<
	T,
	{ ok: false }
>["reason"];

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
	const parsed = toNumber(value);
	if (Number.isNaN(parsed)) {
		return { ok: false, reason: "invalid_number" };
	}
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return { ok: false, reason: "non_positive_integer" };
	}
	return { ok: true, value: parsed };
}

//
// Number Coercion
//

const toNumber = (value: unknown): number =>
	typeof value === "number"
		? value
		: typeof value === "string"
			? Number(value)
			: Number.NaN;

//
// Non-negative Integer Parser
//

export type ParseNonNegativeIntegerResult = ParseResult<
	number,
	"invalid_number" | "negative_integer" | "non_integer"
>;

export function parseNonNegativeInteger(
	value: unknown,
): ParseNonNegativeIntegerResult {
	const parsed = toNumber(value);
	if (Number.isNaN(parsed)) {
		return { ok: false, reason: "invalid_number" };
	}
	if (!Number.isInteger(parsed)) {
		return { ok: false, reason: "non_integer" };
	}
	if (parsed < 0) {
		return { ok: false, reason: "negative_integer" };
	}
	return { ok: true, value: parsed };
}

//
// Time Parsers
//

export type ParseMinutesResult = ParseResult<
	Minutes,
	ParseFailureReason<ParseNonNegativeIntegerResult>
>;

export function parseMinutes(value: unknown): ParseMinutesResult {
	return parseNonNegativeInteger(value);
}

export type ParseSecondsResult = ParseResult<
	Seconds,
	ParseFailureReason<ParseNonNegativeIntegerResult> | "out_of_range_seconds"
>;

export function parseSeconds(value: unknown): ParseSecondsResult {
	const parsed = parseNonNegativeInteger(value);
	if (!parsed.ok) {
		return parsed;
	}
	if (!isSeconds(parsed.value)) {
		return { ok: false, reason: "out_of_range_seconds" };
	}
	return { ok: true, value: parsed.value };
}
