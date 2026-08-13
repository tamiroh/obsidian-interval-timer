import { isMinutes, isSeconds, type Minutes, type Seconds } from "./time";
import { err, ok, type Result, type ResultFailureReason } from "./result";

//
// Positive Integer Parser
//

export type ParsePositiveIntegerResult = Result<
	number,
	"invalid_number" | "non_positive_integer"
>;

export function parsePositiveInteger(
	value: unknown,
): ParsePositiveIntegerResult {
	const parsed = toNumber(value);
	if (Number.isNaN(parsed)) {
		return err("invalid_number");
	}
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return err("non_positive_integer");
	}
	return ok(parsed);
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

export type ParseNonNegativeIntegerResult = Result<
	number,
	"invalid_number" | "negative_integer" | "non_integer"
>;

export function parseNonNegativeInteger(
	value: unknown,
): ParseNonNegativeIntegerResult {
	const parsed = toNumber(value);
	if (Number.isNaN(parsed)) {
		return err("invalid_number");
	}
	if (!Number.isInteger(parsed)) {
		return err("non_integer");
	}
	if (parsed < 0) {
		return err("negative_integer");
	}
	return ok(parsed);
}

//
// Time Parsers
//

export type ParseMinutesResult = Result<
	Minutes,
	ResultFailureReason<ParseNonNegativeIntegerResult> | "out_of_range_minutes"
>;

export function parseMinutes(value: unknown): ParseMinutesResult {
	const parsed = parseNonNegativeInteger(value);
	if (!parsed.ok) {
		return parsed;
	}
	if (!isMinutes(parsed.value)) {
		return err("out_of_range_minutes");
	}
	return ok(parsed.value);
}

export type ParseSecondsResult = Result<
	Seconds,
	ResultFailureReason<ParseNonNegativeIntegerResult> | "out_of_range_seconds"
>;

export function parseSeconds(value: unknown): ParseSecondsResult {
	const parsed = parseNonNegativeInteger(value);
	if (!parsed.ok) {
		return parsed;
	}
	if (!isSeconds(parsed.value)) {
		return err("out_of_range_seconds");
	}
	return ok(parsed.value);
}
