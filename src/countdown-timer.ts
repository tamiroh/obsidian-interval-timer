import { match } from "ts-pattern";
import type { Result } from "./result";
import { Seconds, Time, toMilliseconds, toSeconds } from "./time";

export const timerTypes = [
	"initialized",
	"running",
	"paused",
	"completed",
] as const;

export type TimerType = (typeof timerTypes)[number];

export type StartTimerResult = Result<
	void,
	"timer_running" | "timer_completed"
>;

export type PauseTimerResult = Result<void, "timer_not_running">;

export type ResetTimerResult = Result<Time, never>;

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

	private readonly onSubtract: ((time: Time) => void) | undefined;

	private readonly onPause: ((current: Time) => void) | undefined;

	private readonly onComplete: (() => void) | undefined;

	private readonly initialTime: Time;

	constructor(
		initialTime: Time,
		onSubtract?: (time: Time) => void,
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

	public start(): StartTimerResult {
		if (this.state.type === "running") {
			return { ok: false, reason: "timer_running" };
		}
		if (this.state.type === "completed") {
			return { ok: false, reason: "timer_completed" };
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
				this.onSubtract?.(this.state.currentTime);
			}
			if (result === "completed") {
				this.onSubtract?.(this.state.currentTime);
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

		return { ok: true, value: undefined };
	}

	public pause(): PauseTimerResult {
		if (this.state.type !== "running") {
			return { ok: false, reason: "timer_not_running" };
		}

		window.clearInterval(this.state.intervalId);
		this.state = {
			type: "paused",
			currentTime: this.state.currentTime,
		};
		this.onPause?.({
			minutes: this.state.currentTime.minutes,
			seconds: this.state.currentTime.seconds,
		});

		return { ok: true, value: undefined };
	}

	public reset(): ResetTimerResult {
		if (this.state.type === "running") {
			window.clearInterval(this.state.intervalId);
		}
		this.state = {
			type: "initialized",
			currentTime: {
				minutes: this.initialTime.minutes,
				seconds: this.initialTime.seconds,
			},
		};
		return {
			ok: true,
			value: {
				minutes: this.initialTime.minutes,
				seconds: this.initialTime.seconds,
			},
		};
	}

	public dispose(): void {
		if (this.state.type !== "running") {
			return;
		}

		window.clearInterval(this.state.intervalId);
		this.state = {
			type: "paused",
			currentTime: this.state.currentTime,
		};
	}

	public getCurrentTimerType(): TimerType {
		return this.state.type;
	}

	public get currentTime(): Time {
		return this.state.type === "completed"
			? { minutes: 0, seconds: 0 }
			: {
					minutes: this.state.currentTime.minutes,
					seconds: this.state.currentTime.seconds,
				};
	}

	private updateCurrentTime(
		startAt: Date,
	): "unchanged" | "subtracted" | "completed" {
		if (this.state.type !== "running") {
			return "unchanged";
		}

		const remainingSeconds = this.computeRemainingSeconds(startAt);
		const previousRemainingSeconds = toSeconds(this.state.currentTime);

		if (remainingSeconds === previousRemainingSeconds) {
			return "unchanged";
		}
		if (remainingSeconds <= 0) {
			this.state.currentTime = { minutes: 0, seconds: 0 };
			return "completed";
		}

		this.state.currentTime = {
			minutes: Math.floor(remainingSeconds / 60),
			seconds: (remainingSeconds % 60) as Seconds,
		};
		return "subtracted";
	}

	private computeRemainingSeconds(startAt: Date): number {
		const elapsedSeconds = Math.floor(
			(Date.now() - startAt.getTime()) / 1000,
		);
		const initialSeconds = toSeconds(this.initialTime);
		return initialSeconds - elapsedSeconds;
	}
}
