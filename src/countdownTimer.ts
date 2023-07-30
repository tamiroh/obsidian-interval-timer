import { Seconds, Time, TimeState } from "./types/time";

export const timerTypes = [
	"initialized",
	"running",
	"paused",
	"completed",
] as const;

export type TimerType = (typeof timerTypes)[number];

export type TimerState =
	| {
			type: (typeof timerTypes)[0];
			currentTime: Time;
	  }
	| {
			type: (typeof timerTypes)[1];
			currentTime: Time;
			intervalId: number;
	  }
	| {
			type: (typeof timerTypes)[2];
			currentTime: Time;
	  }
	| {
			type: (typeof timerTypes)[3];
	  };

export class CountdownTimer {
	private state: TimerState;

	private readonly onSubtract: (time: Time) => void;

	private readonly onPause: ((current: Time) => void) | undefined;

	private readonly onComplete: (() => void) | undefined;

	private readonly initialTime: Time;

	constructor(
		initialTime: Time,
		onSubtract: (time: Time) => void,
		onPause?: (current: Time) => void,
		onComplete?: () => void,
	) {
		this.onPause = onPause;
		this.onComplete = onComplete;
		this.initialTime = {
			minutes: initialTime.minutes,
			seconds: initialTime.seconds,
		};
		this.state = { type: "initialized", currentTime: initialTime };
		this.onSubtract = onSubtract;
	}

	public start(): { type: "succeeded" } | { type: "failed" } {
		if (this.state.type === "completed" || this.state.type === "running") {
			return { type: "failed" };
		}

		const intervalId = window.setInterval(() => {
			if (this.state.type !== "running") {
				window.clearInterval(intervalId);
				return;
			}

			const result = this.subtractSecond(this.state.currentTime);

			if (result.type === "subtracted") {
				this.state.currentTime = result.time;
				this.onSubtract(this.state.currentTime);
			}
			if (result.type === "exceeded") {
				window.clearInterval(intervalId);
				this.state = { type: "completed" };
				this.onComplete?.();
			}
		}, 1000);

		this.state = {
			type: "running",
			intervalId,
			currentTime: this.state.currentTime,
		};

		return { type: "succeeded" };
	}

	public pause(): { type: "succeeded" } | { type: "failed" } {
		if (this.state.type !== "running") return { type: "failed" };

		window.clearInterval(this.state.intervalId);
		this.state = {
			type: "paused",
			currentTime: this.state.currentTime,
		};
		this.onPause?.({
			minutes: this.state.currentTime.minutes,
			seconds: this.state.currentTime.seconds,
		});

		return { type: "succeeded" };
	}

	public reset(): { type: "succeeded"; resetTo: Time } | { type: "failed" } {
		if (this.state.type === "running") {
			window.clearInterval(this.state.intervalId);
		}
		this.state = {
			type: "initialized",
			currentTime: this.initialTime,
		};
		return {
			type: "succeeded",
			resetTo: {
				minutes: this.initialTime.minutes,
				seconds: this.initialTime.seconds,
			},
		};
	}

	public getIntervalId(): number | undefined {
		return this.state.type === "running"
			? this.state.intervalId
			: undefined;
	}

	private subtractSecond({ minutes, seconds }: Time): TimeState {
		if (seconds === 0) {
			if (minutes === 0) return { type: "exceeded" };
			return {
				type: "subtracted",
				time: { minutes: minutes - 1, seconds: 59 },
			};
		}
		return {
			type: "subtracted",
			time: { minutes, seconds: (seconds - 1) as Seconds },
		};
	}
}
