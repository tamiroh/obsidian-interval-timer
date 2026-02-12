import { match } from "ts-pattern";
import { Seconds, Time, toMilliseconds, toSeconds } from "./time";

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
		this.state = {
			type: "initialized",
			currentTime: {
				minutes: initialTime.minutes,
				seconds: initialTime.seconds,
			},
		};
		this.onSubtract = onSubtract;
	}

	public start(): { type: "succeeded" } | { type: "failed" } {
		if (this.state.type === "completed" || this.state.type === "running") {
			return { type: "failed" };
		}

		const startAt = match(this.state)
			.with({ type: "initialized" }, () => new Date())
			.with({ type: "paused" }, (state) => {
				const elapsedMs =
					toMilliseconds(this.initialTime) -
					toMilliseconds(state.currentTime);
				return new Date(Date.now() - elapsedMs);
			})
			.exhaustive();

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

	public getIntervalId(): number | undefined {
		return this.state.type === "running"
			? this.state.intervalId
			: undefined;
	}

	public getCurrentTimerType(): TimerType {
		return this.state.type;
	}

	private updateCurrentTime(
		startAt: Date,
	): "unchanged" | "subtracted" | "exceeded" {
		if (this.state.type !== "running") {
			return "unchanged";
		}

		const diff = Math.floor((Date.now() - startAt.getTime()) / 1000);
		const initialTimeInSeconds = toSeconds(this.initialTime);
		const nextCurrentTimeInSeconds = initialTimeInSeconds - diff;

		this.state.currentTime = {
			minutes: Math.floor(nextCurrentTimeInSeconds / 60),
			seconds: (nextCurrentTimeInSeconds % 60) as Seconds,
		};

		return nextCurrentTimeInSeconds >= 0 ? "subtracted" : "exceeded";
	}
}
