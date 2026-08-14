import { match } from "ts-pattern";
import { err, ok, type Result } from "./result";
import { isMinutes, Seconds, Time, toMilliseconds, toSeconds } from "./time";

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
			timeoutId: number;
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
			return err("timer_running");
		}
		if (this.state.type === "completed") {
			return err("timer_completed");
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

		this.state = {
			type: "running",
			timeoutId: this.scheduleNextTick(startAt),
			currentTime: this.state.currentTime,
		};

		return ok();
	}

	private scheduleNextTick(startAt: Date): number {
		const elapsedMs = Math.max(0, Date.now() - startAt.getTime());
		const delayMs = 1000 - (elapsedMs % 1000);

		return window.setTimeout(() => {
			if (this.state.type !== "running") return;

			const result = this.updateCurrentTime(startAt);

			if (result === "subtracted") {
				this.onSubtract?.(this.state.currentTime);
			}
			if (result === "completed") {
				this.onSubtract?.(this.state.currentTime);
				this.state = { type: "completed" };
				this.onComplete?.();
				return;
			}

			this.state = {
				type: "running",
				currentTime: this.state.currentTime,
				timeoutId: this.scheduleNextTick(startAt),
			};
		}, delayMs);
	}

	public pause(): PauseTimerResult {
		if (this.state.type !== "running") {
			return err("timer_not_running");
		}

		window.clearTimeout(this.state.timeoutId);
		this.state = {
			type: "paused",
			currentTime: this.state.currentTime,
		};
		this.onPause?.({
			minutes: this.state.currentTime.minutes,
			seconds: this.state.currentTime.seconds,
		});

		return ok();
	}

	public reset(): ResetTimerResult {
		if (this.state.type === "running") {
			window.clearTimeout(this.state.timeoutId);
		}
		this.state = {
			type: "initialized",
			currentTime: {
				minutes: this.initialTime.minutes,
				seconds: this.initialTime.seconds,
			},
		};
		return ok({
			minutes: this.initialTime.minutes,
			seconds: this.initialTime.seconds,
		});
	}

	public dispose(): void {
		if (this.state.type !== "running") {
			return;
		}

		window.clearTimeout(this.state.timeoutId);
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

		const remainingMinutes = Math.floor(remainingSeconds / 60);
		this.state.currentTime = {
			minutes: isMinutes(remainingMinutes)
				? remainingMinutes
				: this.state.currentTime.minutes,
			seconds: (remainingSeconds % 60) as Seconds,
		};
		return "subtracted";
	}

	private computeRemainingSeconds(startAt: Date): number {
		const elapsedSeconds = Math.max(
			0,
			Math.floor((Date.now() - startAt.getTime()) / 1000),
		);
		return toSeconds(this.initialTime) - elapsedSeconds;
	}
}
