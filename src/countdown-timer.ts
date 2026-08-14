import { match } from "ts-pattern";
import { err, ok, type Result } from "./result";
import { isMinutes, Seconds, Time, toSignedSeconds } from "./time";

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

	private completionSignaled: boolean;

	private continuePastZero: boolean;

	constructor(
		initialTime: Time,
		onSubtract?: (time: Time) => void,
		onPause?: (current: Time) => void,
		onComplete?: () => void,
		continuePastZero = false,
	) {
		this.onPause = onPause;
		this.onComplete = onComplete;
		this.initialTime = structuredClone(initialTime);
		this.state = {
			type: "initialized",
			currentTime: structuredClone(initialTime),
		};
		this.onSubtract = onSubtract;
		this.completionSignaled = initialTime.negative === true;
		this.continuePastZero = continuePastZero;
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
					(toSignedSeconds(this.initialTime) -
						toSignedSeconds(state.currentTime)) *
					1000;
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
				this.completionSignaled = true;
				if (!this.continuePastZero) {
					this.state = { type: "completed" };
					this.onComplete?.();
					return;
				}
				this.onComplete?.();
			}

			this.state = {
				type: "running",
				currentTime: this.state.currentTime,
				timeoutId: this.scheduleNextTick(startAt),
			};
		}, delayMs);
	}

	public setContinuePastZero(enabled: boolean): void {
		this.continuePastZero = enabled;
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
		this.onPause?.(structuredClone(this.state.currentTime));

		return ok();
	}

	public reset(): ResetTimerResult {
		if (this.state.type === "running") {
			window.clearTimeout(this.state.timeoutId);
		}
		this.state = {
			type: "initialized",
			currentTime: structuredClone(this.initialTime),
		};
		this.completionSignaled = this.initialTime.negative === true;
		return ok(structuredClone(this.initialTime));
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
			: structuredClone(this.state.currentTime);
	}

	private updateCurrentTime(
		startAt: Date,
	): "unchanged" | "subtracted" | "completed" {
		if (this.state.type !== "running") {
			return "unchanged";
		}

		const remainingSeconds = this.computeRemainingSeconds(startAt);
		const previousRemainingSeconds = toSignedSeconds(
			this.state.currentTime,
		);

		if (
			remainingSeconds === previousRemainingSeconds &&
			(this.completionSignaled || remainingSeconds > 0)
		) {
			return "unchanged";
		}
		if (remainingSeconds <= 0 && !this.completionSignaled) {
			this.state.currentTime = { minutes: 0, seconds: 0 };
			return "completed";
		}

		const absoluteRemainingSeconds = Math.abs(remainingSeconds);
		const remainingMinutes = Math.floor(absoluteRemainingSeconds / 60);
		if (!isMinutes(remainingMinutes)) {
			return "unchanged";
		}
		this.state.currentTime = {
			minutes: remainingMinutes,
			seconds: (absoluteRemainingSeconds % 60) as Seconds,
			...(remainingSeconds < 0 ? { negative: true as const } : {}),
		};
		return "subtracted";
	}

	private computeRemainingSeconds(startAt: Date): number {
		const elapsedSeconds = Math.max(
			0,
			Math.floor((Date.now() - startAt.getTime()) / 1000),
		);
		return toSignedSeconds(this.initialTime) - elapsedSeconds;
	}
}
