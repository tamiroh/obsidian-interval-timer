import { Minutes, Seconds, TimeState } from "./types";

export class Time {
	public readonly minutes: Minutes;

	public readonly seconds: Seconds;

	constructor(minutes: Minutes, seconds: Seconds) {
		this.minutes = minutes;
		this.seconds = seconds;
	}

	public subtractSecond(): TimeState {
		if (this.seconds === 0) {
			if (this.minutes === 0) return { type: "exceeded" };
			return {
				type: "subtracted",
				time: new Time(this.minutes - 1, 59),
			};
		}
		return {
			type: "subtracted",
			time: new Time(this.minutes, (this.seconds - 1) as Seconds),
		};
	}
}
