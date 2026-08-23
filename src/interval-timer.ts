import { match } from "ts-pattern";
import { CountdownTimer, type TimerType } from "./countdown-timer";
import {
	type DurationMinutesReason,
	type Minutes,
	parseDurationMinutes,
	type Seconds,
	time,
	type Time,
} from "./time";
import { DailyScheduler } from "./daily-scheduler";
import { err, ok, type Result } from "./result";

//
// Settings
//

export type IntervalTimerSetting = {
	focusIntervalDuration: Minutes;
	shortBreakDuration: Minutes;
	longBreakDuration: Minutes;
	longBreakAfter: number;
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

export type Snapshot = {
	minutes: Minutes;
	seconds: Seconds;
	state: IntervalTimerState;
	focusIntervals: { total: number; set: number };
};

export type IntervalTimerStatus = {
	timerState: TimerType;
	snapshot: Snapshot;
};

export const isFocusRunning = ({
	timerState,
	snapshot,
}: IntervalTimerStatus): boolean =>
	snapshot.state === "focus" && timerState === "running";

//
// Events
//

type IntervalTimerEventDetails =
	| { type: "state-changed"; timerState: TimerType }
	| { type: "timer-started"; mode: "fresh" | "resumed" }
	| { type: "timer-paused" }
	| { type: "timer-reset" }
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
	DurationMinutesReason | "timer_running"
>;

export type TouchAction = "start" | "resume" | "reset" | "skip";

export class IntervalTimer {
	private countdownTimer: CountdownTimer;

	private currentState: IntervalTimerState;

	private focusIntervals: { total: number; set: number };

	private readonly eventListeners = new Set<
		(event: IntervalTimerEvent) => void
	>();

	private settings: IntervalTimerSetting;

	private readonly autoResetScheduler: DailyScheduler;

	constructor(settings: IntervalTimerSetting) {
		this.focusIntervals = { total: 0, set: 0 };
		this.settings = structuredClone(settings);
		this.countdownTimer = this.createTimer(
			this.settings.focusIntervalDuration,
			0,
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
		return this.currentState !== "focus";
	}

	public get canPause(): boolean {
		return this.countdownTimer.getCurrentTimerType() === "running";
	}

	public get canStart(): boolean {
		return match(this.countdownTimer.getCurrentTimerType())
			.with("initialized", "paused", () => true)
			.with("running", "completed", () => false)
			.exhaustive();
	}

	public get status(): IntervalTimerStatus {
		return {
			timerState: this.countdownTimer.getCurrentTimerType(),
			snapshot: this.getSnapshot(),
		};
	}

	public get state(): IntervalTimerState {
		return this.currentState;
	}

	public applySnapshot(snapshot: Snapshot): void {
		this.focusIntervals = {
			total: snapshot.focusIntervals.total,
			set: snapshot.focusIntervals.set,
		};
		this.enterInterval(
			snapshot.state,
			time(snapshot.minutes, snapshot.seconds),
		);
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
	}

	public start(): void {
		const countdownTimerType = this.countdownTimer.getCurrentTimerType();

		const result = this.countdownTimer.start();
		if (!result.ok) return;

		this.emitStateChanged("running");
		this.emit({
			type: "timer-started",
			mode: countdownTimerType === "initialized" ? "fresh" : "resumed",
		});
	}

	public pause(): void {
		if (this.countdownTimer.pause().ok) {
			this.emit({ type: "timer-paused" });
		}
	}

	public reset(): void {
		this.countdownTimer.reset();
		this.emitStateChanged("initialized");
		this.emit({ type: "timer-reset" });
	}

	public resetIntervalsSet(): void {
		this.focusIntervals.set = 0;
		this.enterInterval(
			"longBreak",
			time(this.settings.longBreakDuration, 0),
		);
	}

	public resetTotalIntervals(): void {
		this.focusIntervals = { total: 0, set: 0 };
		this.enterInterval(
			"focus",
			time(this.settings.focusIntervalDuration, 0),
		);
	}

	public skipInterval(): void {
		this.countdownTimer.dispose();
		this.enterNextInterval({ reason: "skipped" });
	}

	public retime(minutes: number): RetimeResult {
		return match(parseDurationMinutes(minutes))
			.with({ ok: false }, ({ reason }) => err(reason))
			.with({ ok: true }, ({ value }) => {
				if (this.countdownTimer.getCurrentTimerType() === "running") {
					return err("timer_running");
				}
				this.enterInterval(
					this.currentState,
					time(value, this.countdownTimer.currentTime.seconds),
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
			.with("skip", () => {
				this.skipInterval();
			})
			.exhaustive();
	}

	public predictTouch(): TouchAction {
		return match(this.countdownTimer.getCurrentTimerType())
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
		match(previousState)
			.with("focus", () => {
				this.focusIntervals = {
					total: this.focusIntervals.total + 1,
					set: this.focusIntervals.set + 1,
				};
				if (this.focusIntervals.set >= this.settings.longBreakAfter) {
					this.focusIntervals.set = 0;
					this.enterInterval(
						"longBreak",
						time(this.settings.longBreakDuration, 0),
					);
				} else {
					this.enterInterval(
						"shortBreak",
						time(this.settings.shortBreakDuration, 0),
					);
				}
			})
			.with("shortBreak", "longBreak", () => {
				this.enterInterval(
					"focus",
					time(this.settings.focusIntervalDuration, 0),
				);
			})
			.exhaustive();

		if (reason === "skipped") {
			this.emit({
				type: "interval-skipped",
				from: previousState,
				to: this.currentState,
			});
			return;
		}
		this.emit({
			type: "interval-completed",
			from: previousState,
			to: this.currentState,
		});
	}

	private createTimer(minutes: Minutes, seconds: Seconds): CountdownTimer {
		const timer = new CountdownTimer({
			initialTime: time(minutes, seconds),
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
					this.enterNextInterval({ reason: "completed" });
				})
				.exhaustive();
		});
		return timer;
	}

	private enterInterval(state: IntervalTimerState, nextTime: Time): void {
		this.countdownTimer.dispose();
		this.countdownTimer = this.createTimer(
			nextTime.minutes,
			nextTime.seconds,
		);
		this.currentState = state;
		this.emitStateChanged("initialized");
	}

	private emitStateChanged(timerState: TimerType): void {
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
			...structuredClone(this.countdownTimer.currentTime),
			state: this.currentState,
			focusIntervals: structuredClone(this.focusIntervals),
		};
	}
}
