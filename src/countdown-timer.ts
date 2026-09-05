import { match } from "ts-pattern";
import { err, ok, type Result } from "./result";
import * as t from "./time";

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
			currentTime: t.Time;
	  }
	| {
			type: (typeof timerStates)[1];
			currentTime: t.Time;
			timeoutId: number;
	  }
	| {
			type: (typeof timerStates)[2];
			currentTime: t.Time;
			elapsedMs: number;
	  }
	| {
			type: (typeof timerStates)[3];
	  };

type CountdownTimerEventDetails =
	{ type: "tick" } | { type: "paused" } | { type: "completed" };

export type CountdownTimerEvent = CountdownTimerEventDetails & {
	occurredAt: Date;
	currentTime: t.Time;
};

export type CountdownTimerOptions = {
	initialTime: t.Time;
	continuePastZero?: boolean;
};

export type MutableCountdownTimerOptions = Pick<
	CountdownTimerOptions,
	"continuePastZero"
>;

const initialStateFor = (
	initialTime: t.Time,
	continuePastZero: boolean,
): StateData =>
	t.toSeconds(initialTime) === 0 && !continuePastZero
		? { type: "completed" }
		: { type: "initialized", currentTime: initialTime };

export class CountdownTimer {
	private currentState: StateData;

	private startAt: Date | null = null;

	private readonly initialTime: t.Time;

	private readonly eventListeners = new Set<
		(event: CountdownTimerEvent) => void
	>();

	private continuePastZero: boolean;

	constructor({
		initialTime,
		continuePastZero = false,
	}: CountdownTimerOptions) {
		this.initialTime = initialTime;
		this.continuePastZero = continuePastZero;
		this.currentState = initialStateFor(initialTime, continuePastZero);
	}

	public get state(): TimerState {
		return this.currentState.type;
	}

	public get currentTime(): t.Time {
		return this.currentState.type === "completed"
			? t.time(0, 0)
			: this.currentState.currentTime;
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
			.with(
				{ type: "paused" },
				(state) => new Date(Date.now() - state.elapsedMs),
			)
			.exhaustive();

		this.startAt = startAt;
		this.currentState = {
			type: "running",
			timeoutId: this.scheduleNextTick(startAt),
			currentTime: this.currentState.currentTime,
		};

		return ok();
	}

	public updateOptions(options: Partial<MutableCountdownTimerOptions>): void {
		if (options.continuePastZero !== undefined) {
			this.continuePastZero = options.continuePastZero;
		}
	}

	public pause(): PauseTimerResult {
		if (this.currentState.type !== "running") {
			return err("timer_not_running");
		}

		window.clearTimeout(this.currentState.timeoutId);
		this.currentState = {
			type: "paused",
			currentTime: this.currentState.currentTime,
			elapsedMs: this.captureElapsedMs(),
		};
		this.emit({ type: "paused" });

		return ok();
	}

	public reset(): t.Time {
		if (this.currentState.type === "running") {
			window.clearTimeout(this.currentState.timeoutId);
		}
		this.currentState = initialStateFor(
			this.initialTime,
			this.continuePastZero,
		);
		return this.initialTime;
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
			elapsedMs: this.captureElapsedMs(),
		};
	}

	private captureElapsedMs(): number {
		return this.startAt ? Date.now() - this.startAt.getTime() : 0;
	}

	private scheduleNextTick(startAt: Date): number {
		const elapsedMs = Math.max(0, Date.now() - startAt.getTime());
		const delayMs = 1000 - (elapsedMs % 1000);

		return window.setTimeout(() => {
			if (this.currentState.type !== "running") return;

			const result = this.updateCurrentTime(startAt);

			if (result === "completed" && !this.continuePastZero) {
				this.currentState = { type: "completed" };
			} else {
				this.currentState = {
					type: "running",
					currentTime: this.currentState.currentTime,
					timeoutId: this.scheduleNextTick(startAt),
				};
			}

			if (result === "subtracted") {
				this.emit({ type: "tick" });
			} else if (result === "completed") {
				this.emit({ type: "tick" });
				this.emit({ type: "completed" });
			}
		}, delayMs);
	}

	private updateCurrentTime(
		startAt: Date,
	): "unchanged" | "subtracted" | "completed" {
		if (this.currentState.type !== "running") {
			return "unchanged";
		}

		const remainingSeconds = this.computeRemainingSeconds(startAt);
		const previousRemainingSeconds = t.toSeconds(
			this.currentState.currentTime,
		);
		const alreadyCompleted = previousRemainingSeconds <= 0;

		if (
			remainingSeconds === previousRemainingSeconds &&
			(alreadyCompleted || remainingSeconds > 0)
		) {
			return "unchanged";
		}
		if (remainingSeconds <= 0 && !alreadyCompleted) {
			this.currentState.currentTime = t.time(0, 0);
			return "completed";
		}

		const nextTime = t.fromSeconds(remainingSeconds);
		if (nextTime === null) {
			return "unchanged";
		}
		this.currentState.currentTime = nextTime;
		return "subtracted";
	}

	private computeRemainingSeconds(startAt: Date): number {
		const elapsedSeconds = Math.max(
			0,
			Math.floor((Date.now() - startAt.getTime()) / 1000),
		);
		return t.toSeconds(this.initialTime) - elapsedSeconds;
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
