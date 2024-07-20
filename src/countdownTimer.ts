import moment, { Moment } from "moment";
import { Seconds, Time } from "./time";

export const timerStates = [
	"initialized",
	"running",
	"paused",
	"completed",
] as const;

export type TimerState = (typeof timerStates)[number];

type InternalState =
	| {
			type: (typeof timerStates)[0];
			currentTime: Time;
	  }
	| {
			type: (typeof timerStates)[1];
			currentTime: Time;
			intervalId: number;
	  }
	| {
			type: (typeof timerStates)[2];
			currentTime: Time;
	  }
	| {
			type: (typeof timerStates)[3];
	  };

export class CountdownTimer {
	private state: InternalState;

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

		const startAt = moment();

		const intervalId = window.setInterval(() => {
			if (this.state.type !== "running") {
				window.clearInterval(intervalId);
				return;
			}

			const result = this.updateCurrentTime(startAt);

			if (result === "subtracted") {
				this.onSubtract(this.state.currentTime);
			}
			if (result === "exceeded") {
				window.clearInterval(intervalId);
				this.state = { type: "completed" };
				this.onComplete?.();
			}
		}, 500);

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

	public getCurrentState(): TimerState {
		return this.state.type;
	}

	public getIntervalId(): number | undefined {
		return this.state.type === "running"
			? this.state.intervalId
			: undefined;
	}

	private updateCurrentTime(
		startAt: Moment,
	): "unchanged" | "subtracted" | "exceeded" {
		if (this.state.type !== "running") {
			return "unchanged";
		}

		const diff = moment().diff(startAt, "seconds");
		const initialTimeInSeconds =
			this.initialTime.minutes * 60 + this.initialTime.seconds;
		const nextCurrentTimeInSeconds = initialTimeInSeconds - diff;

		this.state.currentTime = {
			minutes: Math.floor(nextCurrentTimeInSeconds / 60),
			seconds: (nextCurrentTimeInSeconds % 60) as Seconds,
		};

		return nextCurrentTimeInSeconds >= 0 ? "subtracted" : "exceeded";
	}
}
