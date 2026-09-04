import { match } from "ts-pattern";
import { CountdownTimer, type TimerState } from "./countdown-timer";
import * as t from "./time";
import { DailyScheduler } from "./daily-scheduler";
import { err, ok, type Result } from "./result";

//
// Settings
//

export const intervalCompletionBehaviors = [
	"advanceToNextInterval",
	"countDownPastZero",
] as const;

export type IntervalCompletionBehavior =
	(typeof intervalCompletionBehaviors)[number];

export type IntervalTimerSetting = {
	focusIntervalDuration: t.Minutes;
	shortBreakDuration: t.Minutes;
	longBreakDuration: t.Minutes;
	longBreakAfter: number;
	intervalCompletionBehavior?: IntervalCompletionBehavior;
	resetTime: { hours: number; minutes: number };
};

export type MutableIntervalTimerSetting = Omit<
	IntervalTimerSetting,
	"resetTime"
>;

export const defaultLongBreakAfter = 4;

//
// State
//

export const intervalTimerStates = [
	"focus",
	"shortBreak",
	"longBreak",
] as const;

export type IntervalTimerState = (typeof intervalTimerStates)[number];

export type Snapshot = t.Time & {
	state: IntervalTimerState;
	nextState?: IntervalTimerState;
	focusIntervals: { total: number; set: number };
};

export type IntervalTimerStatus = {
	timerState: TimerState;
	snapshot: Snapshot;
};

export const isFocusRunning = ({
	timerState,
	snapshot,
}: IntervalTimerStatus): boolean =>
	snapshot.state === "focus" &&
	timerState === "running" &&
	!t.isNegative(snapshot) &&
	snapshot.nextState === undefined;

//
// Events
//

type IntervalTimerEventDetails =
	| { type: "state-changed"; timerState: TimerState }
	| { type: "timer-started"; mode: "fresh" | "resumed" }
	| { type: "timer-paused" }
	| { type: "timer-reset" }
	| { type: "timer-completed" }
	| {
			type: "focus-interval-ended";
			reason: "completed" | "skipped";
	  }
	| {
			type: "interval-completed";
			from: IntervalTimerState;
			to: IntervalTimerState;
	  }
	| {
			type: "interval-skipped";
			from: IntervalTimerState;
			to: IntervalTimerState;
	  };

export type IntervalTimerEvent = IntervalTimerEventDetails & {
	occurredAt: Date;
	snapshot: Snapshot;
};

//
// Timer
//

export type RetimeResult = Result<
	void,
	t.DurationMinutesReason | "timer_running"
>;

export type TouchAction = "start" | "resume" | "reset" | "skip" | "next";

export class IntervalTimer {
	private countdownTimer: CountdownTimer;

	private currentState: IntervalTimerState;

	private focusIntervals: { total: number; set: number };

	private readonly eventListeners = new Set<
		(event: IntervalTimerEvent) => void
	>();

	private settings: IntervalTimerSetting;

	private readonly autoResetScheduler: DailyScheduler;

	private pendingNextState: IntervalTimerState | null = null;

	constructor(settings: IntervalTimerSetting) {
		this.focusIntervals = { total: 0, set: 0 };
		this.settings = structuredClone(settings);
		this.countdownTimer = this.createTimer(
			t.time(this.settings.focusIntervalDuration, 0),
		);
		this.currentState = "focus";
		this.autoResetScheduler = new DailyScheduler(
			this.settings.resetTime,
			() => {
				this.resetTotalIntervals();
			},
		);
	}

	public get canSkip(): boolean {
		return this.pendingNextState !== null || this.currentState !== "focus";
	}

	public get canPause(): boolean {
		if (this.pendingNextState !== null) {
			return false;
		}
		return this.countdownTimer.state === "running";
	}

	public get canStart(): boolean {
		if (this.pendingNextState !== null) {
			return false;
		}
		return match(this.countdownTimer.state)
			.with("initialized", "paused", () => true)
			.with("running", "completed", () => false)
			.exhaustive();
	}

	public get status(): IntervalTimerStatus {
		return {
			timerState: this.countdownTimer.state,
			snapshot: this.getSnapshot(),
		};
	}

	public get state(): IntervalTimerState {
		return this.currentState;
	}

	public applySnapshot(snapshot: Snapshot): void {
		const { state, nextState, focusIntervals, ...currentTime } =
			structuredClone(snapshot);
		this.focusIntervals = focusIntervals;
		this.enterInterval(state, currentTime, nextState);
	}

	public subscribe(
		listener: (event: IntervalTimerEvent) => void,
	): () => void {
		this.eventListeners.add(listener);
		return () => this.eventListeners.delete(listener);
	}

	public enableAutoReset(): void {
		this.autoResetScheduler.enable();
	}

	public disableAutoReset(): void {
		this.autoResetScheduler.disable();
	}

	public updateSettings(
		settings: Partial<MutableIntervalTimerSetting>,
	): void {
		this.settings = { ...structuredClone(this.settings), ...settings };
		if (settings.intervalCompletionBehavior === undefined) {
			return;
		}

		this.countdownTimer.updateOptions({
			continuePastZero:
				settings.intervalCompletionBehavior === "countDownPastZero",
		});
		if (
			settings.intervalCompletionBehavior === "advanceToNextInterval" &&
			this.pendingNextState !== null
		) {
			this.enterInterval(
				this.pendingNextState,
				this.getIntervalDuration(this.pendingNextState),
			);
		}
	}

	public start(): void {
		if (!this.canStart) {
			return;
		}

		const countdownTimerState = this.countdownTimer.state;

		const result = this.countdownTimer.start();
		if (!result.ok) return;

		this.emitStateChanged("running");
		this.emit({
			type: "timer-started",
			mode: countdownTimerState === "initialized" ? "fresh" : "resumed",
		});
	}

	public pause(): void {
		if (!this.canPause) {
			return;
		}
		if (this.countdownTimer.pause().ok) {
			this.emit({ type: "timer-paused" });
		}
	}

	public reset(): void {
		const resetTime = this.countdownTimer.reset();
		if (t.isNegative(resetTime)) {
			this.enterInterval(
				this.currentState,
				this.getIntervalDuration(this.currentState),
			);
		} else {
			this.pendingNextState = null;
			this.emitStateChanged("initialized");
		}
		this.emit({ type: "timer-reset" });
	}

	public resetIntervalsSet(): void {
		this.focusIntervals.set = 0;
		this.enterInterval(
			"longBreak",
			t.time(this.settings.longBreakDuration, 0),
		);
	}

	public resetTotalIntervals(): void {
		this.focusIntervals = { total: 0, set: 0 };
		this.enterInterval(
			"focus",
			t.time(this.settings.focusIntervalDuration, 0),
		);
	}

	public skipInterval(): void {
		this.countdownTimer.dispose();
		if (this.pendingNextState !== null) {
			this.enterInterval(
				this.pendingNextState,
				this.getIntervalDuration(this.pendingNextState),
			);
			return;
		}
		this.enterNextInterval({ reason: "skipped" });
	}

	public retime(minutes: number): RetimeResult {
		return match(t.parseDurationMinutes(minutes))
			.with({ ok: false }, ({ reason }) => err(reason))
			.with({ ok: true }, ({ value }) => {
				if (
					this.countdownTimer.state === "running" ||
					this.pendingNextState !== null
				) {
					return err("timer_running");
				}
				this.enterInterval(
					this.currentState,
					t.time(value, this.countdownTimer.currentTime.seconds),
				);
				return ok();
			})
			.exhaustive();
	}

	public touch(): void {
		const action = this.predictTouch();
		match(action)
			.with("start", "resume", () => {
				this.start();
			})
			.with("reset", () => {
				this.reset();
			})
			.with("skip", "next", () => {
				this.skipInterval();
			})
			.exhaustive();
	}

	public predictTouch(): TouchAction {
		if (this.pendingNextState !== null) {
			return "next";
		}
		return match(this.countdownTimer.state)
			.with("initialized", "completed", () => "start" as const)
			.with("paused", () => "resume" as const)
			.with("running", () =>
				this.currentState === "focus" ? "reset" : "skip",
			)
			.exhaustive();
	}

	public dispose(): void {
		this.countdownTimer.dispose();
		this.disableAutoReset();
		this.eventListeners.clear();
	}

	private enterNextInterval({
		reason,
	}: {
		reason: "completed" | "skipped";
	}): void {
		const previousState = this.currentState;
		if (previousState === "focus") {
			this.emit({ type: "focus-interval-ended", reason });
		}
		const nextState = match(previousState)
			.with("focus", () => {
				this.focusIntervals = {
					total: this.focusIntervals.total + 1,
					set: this.focusIntervals.set + 1,
				};
				if (this.focusIntervals.set >= this.settings.longBreakAfter) {
					this.focusIntervals.set = 0;
					return "longBreak" as const;
				}
				return "shortBreak" as const;
			})
			.with("shortBreak", "longBreak", () => "focus" as const)
			.exhaustive();

		if (
			reason === "completed" &&
			this.settings.intervalCompletionBehavior === "countDownPastZero"
		) {
			this.pendingNextState = nextState;
			this.emitStateChanged("running");
		} else {
			this.enterInterval(nextState, this.getIntervalDuration(nextState));
		}

		if (reason === "skipped") {
			this.emit({
				type: "interval-skipped",
				from: previousState,
				to: nextState,
			});
			return;
		}
		this.emit({
			type: "interval-completed",
			from: previousState,
			to: nextState,
		});
	}

	private createTimer(initialTime: t.Time): CountdownTimer {
		const timer = new CountdownTimer({
			initialTime,
			continuePastZero:
				this.settings.intervalCompletionBehavior ===
				"countDownPastZero",
		});
		timer.subscribe((event) => {
			match(event.type)
				.with("tick", () => {
					this.emitStateChanged("running");
				})
				.with("paused", () => {
					this.emitStateChanged("paused");
				})
				.with("completed", () => {
					this.emit({ type: "timer-completed" });
					this.enterNextInterval({ reason: "completed" });
				})
				.exhaustive();
		});
		return timer;
	}

	private enterInterval(
		state: IntervalTimerState,
		nextTime: t.Time,
		pendingNextState?: IntervalTimerState,
	): void {
		this.countdownTimer.dispose();
		this.countdownTimer = this.createTimer(nextTime);
		this.currentState = state;
		this.pendingNextState = pendingNextState ?? null;
		this.emitStateChanged("initialized");
	}

	private emitStateChanged(timerState: TimerState): void {
		this.emit({ type: "state-changed", timerState });
	}

	private emit(event: IntervalTimerEventDetails): void {
		const timestampedEvent = {
			...structuredClone(event),
			occurredAt: new Date(),
			snapshot: this.getSnapshot(),
		};
		this.eventListeners.forEach((listener) => {
			listener(timestampedEvent);
		});
	}

	private getSnapshot(): Snapshot {
		return {
			...this.countdownTimer.currentTime,
			state: this.currentState,
			...(this.pendingNextState
				? { nextState: this.pendingNextState }
				: {}),
			focusIntervals: structuredClone(this.focusIntervals),
		};
	}

	private getIntervalDuration(state: IntervalTimerState): t.Time {
		return t.time(
			match(state)
				.with("focus", () => this.settings.focusIntervalDuration)
				.with("shortBreak", () => this.settings.shortBreakDuration)
				.with("longBreak", () => this.settings.longBreakDuration)
				.exhaustive(),
			0,
		);
	}
}
