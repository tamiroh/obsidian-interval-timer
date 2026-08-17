import type { Enumerate } from "./enumerate";

export const minutesUpperBound = 600;
export const secondsUpperBound = 60;

export type Minutes = Enumerate<typeof minutesUpperBound>;
export type Seconds = Enumerate<typeof secondsUpperBound>;

export type Time = {
	minutes: Minutes;
	seconds: Seconds;
	negative?: true;
};

export const time = (minutes: Minutes, seconds: Seconds): Time => ({
	minutes,
	seconds,
});

export const isMinutes = (value: number): value is Minutes =>
	Number.isInteger(value) && value >= 0 && value < minutesUpperBound;

export const isSeconds = (value: number): value is Seconds =>
	Number.isInteger(value) && value >= 0 && value < secondsUpperBound;

export const toSeconds = ({ minutes, seconds }: Time): number =>
	minutes * 60 + seconds;

export const toSignedSeconds = (value: Time): number =>
	(value.negative ? -1 : 1) * toSeconds(value);

export const toMilliseconds = (value: Time): number => toSeconds(value) * 1000;
