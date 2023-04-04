import { Time } from "../time/time";

export const format = (time: Time): string =>
	`${String(time.minutes).padStart(2, "0")}:${String(time.seconds).padStart(
		2,
		"0",
	)}`;
