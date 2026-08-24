import { match } from "ts-pattern";
import { err, ok, type Result } from "./result";
import { isSeconds, time, type Time, toSignedSeconds } from "./time";

export const timerStates = [
	"initialized",
	"running",
	"paused",
	"completed",
] as const;

export type TimerState = (typeof timerStates)[number];

export type StartTimerResult = Result<
	void,
	"timer_running" | "timer_completed"
>;

export type PauseTimerResult = Result<void, "timer_not_running">;

type StateData =
	| {
			type: (typeof timerStates)[0];
			currentTime: Time;
	  }
	| {
			type: (typeof timerStates)[1];
			currentTime: Time;
			timeoutId: number;
	  }
	| {
			type: (typeof timerStates)[2];
			currentTime: Time;
	  }
	| {
			type: (typeof timerStates)[3];
	  };

type CountdownTimerEventDetails =
	| { type: "tick" }
	| { type: "paused" }
	| { type: "completed" };

export type CountdownTimerEvent = CountdownTimerEventDetails & {
	occurredAt: Date;
	currentTime: Time;
};

export type CountdownTimerOptions = {
	initialTime: Time;
	continuePastZero?: boolean;
};

export class CountdownTimer {
	private currentState: StateData;

	private readonly initialTime: Time;

	private readonly eventListeners = new Set<
		(event: CountdownTimerEvent) => void
	>();

	private completionSignaled: boolean;

	private continuePastZero: boolean;

	constructor({ initialTime, continuePastZero = false }: CountdownTimerOptions) {
		this.initialTime = cloneTime(initialTime);
		this.currentState = {
			type: "initialized",
			currentTime: cloneTime(initialTime),
		};
		this.completionSignaled = initialTime.negative === true;
		this.continuePastZero = continuePastZero;
	}

	public get state(): TimerState {
		return this.currentState.type;
	}

	public getCurrentTimerType(): TimerState {
		return this.state;
	}

	public get currentTime(): Time {
		return this.currentState.type === "completed"
			? time(0, 0)
			: cloneTime(this.currentState.currentTime);
	}

	public subscribe(
		listener: (event: CountdownTimerEvent) => void,
	): () => void {
		this.eventListeners.add(listener);
		return () => this.eventListeners.delete(listener);
	}

	public start(): StartTimerResult {
		if (this.currentState.type === "running") {
			return err("timer_running");
		}
		if (this.currentState.type === "completed") {
			return err("timer_completed");
		}

		const startAt = match(this.currentState)
			.with({ type: "initialized" }, () => new Date())
			.with({ type: "paused" }, (state) => {
				const elapsedMs =
					(toSignedSeconds(this.initialTime) -
						toSignedSeconds(state.currentTime)) *
					1000;
				return new Date(Date.now() - elapsedMs);
			})
			.exhaustive();

		this.currentState = {
			type: "running",
			timeoutId: this.scheduleNextTick(startAt),
			currentTime: this.currentState.currentTime,
		};

		return ok();
	}

	public setContinuePastZero(enabled: boolean): void {
		this.continuePastZero = enabled;
	}

	public pause(): PauseTimerResult {
		if (this.currentState.type !== "running") {
			return err("timer_not_running");
		}

		window.clearTimeout(this.currentState.timeoutId);
		this.currentState = {
			type: "paused",
			currentTime: this.currentState.currentTime,
		};
		this.emit({ type: "paused" });

		return ok();
	}

	public reset(): Time {
		if (this.currentState.type === "running") {
			window.clearTimeout(this.currentState.timeoutId);
		}
		this.currentState = {
			type: "initialized",
			currentTime: cloneTime(this.initialTime),
		};
		this.completionSignaled = this.initialTime.negative === true;
		return cloneTime(this.initialTime);
	}

	public dispose(): void {
		this.eventListeners.clear();

		if (this.currentState.type !== "running") {
			return;
		}

		window.clearTimeout(this.currentState.timeoutId);
		this.currentState = {
			type: "paused",
			currentTime: this.currentState.currentTime,
		};
	}

	private scheduleNextTick(startAt: Date): number {
		const elapsedMs = Math.max(0, Date.now() - startAt.getTime());
		const delayMs = 1000 - (elapsedMs % 1000);

		return window.setTimeout(() => {
			if (this.currentState.type !== "running") return;

			const result = this.updateCurrentTime(startAt);

			if (result === "subtracted") {
				this.emit({ type: "tick" });
			}
			if (result === "completed") {
				this.emit({ type: "tick" });
				this.emit({ type: "completed" });
				this.completionSignaled = true;
				if (!this.continuePastZero) {
					this.currentState = { type: "completed" };
					return;
				}
			}

			this.currentState = {
				type: "running",
				currentTime: this.currentState.currentTime,
				timeoutId: this.scheduleNextTick(startAt),
			};
		}, delayMs);
	}

	private updateCurrentTime(
		startAt: Date,
	): "unchanged" | "subtracted" | "completed" {
		if (this.currentState.type !== "running") {
			return "unchanged";
		}

		const remainingSeconds = this.computeRemainingSeconds(startAt);
		const previousRemainingSeconds = toSignedSeconds(
			this.currentState.currentTime,
		);

		if (
			remainingSeconds === previousRemainingSeconds &&
			(this.completionSignaled || remainingSeconds > 0)
		) {
			return "unchanged";
		}
		if (remainingSeconds <= 0 && !this.completionSignaled) {
			this.currentState.currentTime = time(0, 0);
			return "completed";
		}

		const absoluteRemainingSeconds = Math.abs(remainingSeconds);
		const remainingMinutes = Math.floor(absoluteRemainingSeconds / 60);
		const remainingSecondsInMinute = absoluteRemainingSeconds % 60;
		if (!isSeconds(remainingSecondsInMinute)) {
			return "unchanged";
		}
		this.currentState.currentTime = {
			minutes: remainingMinutes as Time["minutes"],
			seconds: remainingSecondsInMinute,
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

	private emit(event: CountdownTimerEventDetails): void {
		const timestampedEvent = {
			...structuredClone(event),
			occurredAt: new Date(),
			currentTime: this.currentTime,
		};
		this.eventListeners.forEach((listener) => {
			listener(timestampedEvent);
		});
	}
}

const cloneTime = (value: Time): Time => ({
	minutes: value.minutes,
	seconds: value.seconds,
	...(value.negative ? { negative: true as const } : {}),
});
