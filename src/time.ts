declare const minutesBrand: unique symbol;
export type Minutes = number & { readonly [minutesBrand]: true };

declare const secondsBrand: unique symbol;
export type Seconds = number & { readonly [secondsBrand]: true };

export type Time = { minutes: Minutes; seconds: Seconds };

export const ensureMinutes = (value: number): Minutes => {
	if (!Number.isInteger(value) || value < 0) {
		throw new RangeError("Minutes must be a non-negative integer.");
	}
	return value as Minutes;
};

export const ensureSeconds = (value: number): Seconds => {
	if (!Number.isInteger(value) || value < 0 || value > 59) {
		throw new RangeError("Seconds must be an integer between 0 and 59.");
	}
	return value as Seconds;
};

export const toTotalSeconds = (time: Time): number =>
	time.minutes * 60 + time.seconds;

export const toTotalMilliseconds = (time: Time): number =>
	toTotalSeconds(time) * 1000;
