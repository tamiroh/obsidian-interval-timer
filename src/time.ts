import { match } from "ts-pattern";
import * as v from "valibot";
import type { Enumerate } from "./enumerate";
import { err, ok, type Result } from "./result";

//
// Minutes and seconds
//

export const minutesUpperBound = 600;
export const secondsUpperBound = 60;

export type Minutes = Enumerate<typeof minutesUpperBound>;
export type Seconds = Enumerate<typeof secondsUpperBound>;

type NonZeroMinutes = Exclude<Minutes, 0>;
type NonZeroSeconds = Exclude<Seconds, 0>;

export const isMinutes = (value: number): value is Minutes =>
	Number.isInteger(value) && value >= 0 && value < minutesUpperBound;

export const isSeconds = (value: number): value is Seconds =>
	Number.isInteger(value) && value >= 0 && value < secondsUpperBound;

export const isNonZeroMinutes = (value: number): value is NonZeroMinutes =>
	value > 0 && isMinutes(value);

//
// Time
//

type NonZeroDuration =
	| { readonly minutes: 0; readonly seconds: NonZeroSeconds }
	| { readonly minutes: NonZeroMinutes; readonly seconds: Seconds };

type PositiveTime = {
	readonly minutes: Minutes;
	readonly seconds: Seconds;
	readonly sign: 1;
};

type NegativeTime = NonZeroDuration & { readonly sign: -1 };

export type Time = PositiveTime | NegativeTime;

export const time = <M extends Minutes, S extends Seconds>(
	minutes: M,
	seconds: S,
): { readonly minutes: M; readonly seconds: S; readonly sign: 1 } => ({
	minutes,
	seconds,
	sign: 1,
});

export const neg = (
	value: NonZeroDuration & { readonly sign: 1 },
): NegativeTime => ({
	...value,
	sign: -1,
});

export const isNegative = (value: Time): value is NegativeTime =>
	value.sign === -1;

export const toSeconds = (value: Time): number =>
	(isNegative(value) ? -1 : 1) * (value.minutes * 60 + value.seconds);

export const toMilliseconds = (value: Time): number => toSeconds(value) * 1000;

export const fromSeconds = (seconds: number): Time | null => {
	const absoluteSeconds = Math.abs(seconds);
	const minutes = Math.floor(absoluteSeconds / 60);
	const secondsInMinute = absoluteSeconds % 60;
	if (!isSeconds(secondsInMinute)) {
		return null;
	}

	if (seconds >= 0) {
		return isMinutes(minutes) ? time(minutes, secondsInMinute) : null;
	}
	if (minutes === 0) {
		return secondsInMinute === 0 ? null : neg(time(0, secondsInMinute));
	}
	return isNonZeroMinutes(minutes)
		? neg(time(minutes, secondsInMinute))
		: null;
};

//
// Parsing
//

const integerSchema = v.pipe(
	v.union([v.number(), v.pipe(v.string(), v.toNumber())]),
	v.finite(),
	v.integer(),
);

const minutesSchema = v.pipe(integerSchema, v.guard(isMinutes));

const secondsSchema = v.pipe(integerSchema, v.guard(isSeconds));

const durationMinutesSchema = v.pipe(
	integerSchema,
	v.minValue(1),
	v.guard(isMinutes),
);

export const parseMinutes = (value: unknown): Minutes | null => {
	const result = v.safeParse(minutesSchema, value);
	return result.success ? result.output : null;
};

export const parseSeconds = (value: unknown): Seconds | null => {
	const result = v.safeParse(secondsSchema, value);
	return result.success ? result.output : null;
};

export type DurationMinutesReason =
	| "invalid_number"
	| "non_integer"
	| "non_positive_integer"
	| "out_of_range_minutes";

export const parseDurationMinutes = (
	value: unknown,
): Result<Minutes, DurationMinutesReason> =>
	match(v.safeParse(durationMinutesSchema, value))
		.with({ success: false }, ({ issues }) =>
			err(durationMinutesReason(issues[0])),
		)
		.with({ success: true }, ({ output }) => ok(output))
		.exhaustive();

const durationMinutesReason = (
	issue: v.InferIssue<typeof durationMinutesSchema>,
): DurationMinutesReason =>
	match(issue.type)
		.with(
			"union",
			"number",
			"string",
			"to_number",
			"finite",
			() => "invalid_number" as const,
		)
		.with("integer", () => "non_integer" as const)
		.with("min_value", () => "non_positive_integer" as const)
		.with("guard", () => "out_of_range_minutes" as const)
		.exhaustive();
