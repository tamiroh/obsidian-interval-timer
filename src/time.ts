import type { Enumerate } from "./enumerate";

export const minutesUpperBound = 600;
export const secondsUpperBound = 60;

export type Minutes = Enumerate<typeof minutesUpperBound>;
export type Seconds = Enumerate<typeof secondsUpperBound>;
export type Time = { minutes: Minutes; seconds: Seconds };

export const isMinutes = (value: number): value is Minutes =>
	Number.isInteger(value) && value >= 0 && value < minutesUpperBound;

export const isSeconds = (value: number): value is Seconds =>
	Number.isInteger(value) && value >= 0 && value < secondsUpperBound;

export const toSeconds = (time: Time): number =>
	time.minutes * 60 + time.seconds;

export const toMilliseconds = (time: Time): number => toSeconds(time) * 1000;
