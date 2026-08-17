import { match } from "ts-pattern";
import * as v from "valibot";
import type { Enumerate } from "./enumerate";

//
// Minutes and seconds
//

export const minutesUpperBound = 600;
export const secondsUpperBound = 60;

export type Minutes = Enumerate<typeof minutesUpperBound>;
export type Seconds = Enumerate<typeof secondsUpperBound>;

export const isMinutes = (value: number): value is Minutes =>
	Number.isInteger(value) && value >= 0 && value < minutesUpperBound;

export const isSeconds = (value: number): value is Seconds =>
	Number.isInteger(value) && value >= 0 && value < secondsUpperBound;

//
// Time
//

export type Time = { minutes: Minutes; seconds: Seconds };

export const time = (minutes: Minutes, seconds: Seconds): Time => ({
	minutes,
	seconds,
});

export const toSeconds = ({ minutes, seconds }: Time): number =>
	minutes * 60 + seconds;

export const toMilliseconds = (value: Time): number => toSeconds(value) * 1000;

//
// Schemas
//

const integerSchema = v.pipe(
	v.union([v.number(), v.pipe(v.string(), v.toNumber())], "Enter a number."),
	v.integer("Enter a whole number."),
);

export const minutesSchema = v.pipe(
	integerSchema,
	v.guard(isMinutes, `Enter fewer than ${minutesUpperBound} minutes.`),
);

export const secondsSchema = v.pipe(
	integerSchema,
	v.guard(isSeconds, `Enter fewer than ${secondsUpperBound} seconds.`),
);

export const durationMinutesSchema = v.pipe(
	integerSchema,
	v.minValue(1, "Enter a positive whole number."),
	v.guard(isMinutes, `Enter fewer than ${minutesUpperBound} minutes.`),
);

export type DurationMinutesReason =
	| "invalid_number"
	| "non_integer"
	| "non_positive_integer"
	| "out_of_range_minutes";

export const durationMinutesReason = (
	issue: v.InferIssue<typeof durationMinutesSchema>,
): DurationMinutesReason =>
	match(issue.type)
		.with(
			"union",
			"number",
			"string",
			"to_number",
			() => "invalid_number" as const,
		)
		.with("integer", () => "non_integer" as const)
		.with("min_value", () => "non_positive_integer" as const)
		.with("guard", () => "out_of_range_minutes" as const)
		.exhaustive();
