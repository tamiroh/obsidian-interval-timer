import { match } from "ts-pattern";
import { CountdownTimer, TimerType } from "./countdown-timer";
import { isMinutes, Minutes, Seconds, Time } from "./time";
import { DailyScheduler } from "./daily-scheduler";
import { parsePositiveInteger } from "./value-parser";
import { err, ok, type Result } from "./result";

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
			notificationMessage: string;
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

export type NotifierContext = {
	state: IntervalTimerState;
};

export type RetimeResult = Result<
	void,
	"invalid_minutes" | "out_of_range_minutes" | "timer_running"
>;

export type TouchAction = "start" | "resume" | "reset" | "skip";

export class IntervalTimer {
	private currentInterval: {
		timer: CountdownTimer;
		state: IntervalTimerState;
	};

	private focusIntervals: { total: number; set: number };

	private readonly eventListeners = new Set<
		(event: IntervalTimerEvent) => void
	>();

	private settings: IntervalTimerSetting;

	private readonly autoResetScheduler: DailyScheduler;

	constructor(settings: IntervalTimerSetting) {
		this.currentInterval = {
			timer: this.createTimer(0, 0), // dummy timer, replaced by enterInterval() below
			state: "focus",
		};
		this.focusIntervals = { total: 0, set: 0 };
		this.settings = {
			...settings,
			resetTime: { ...settings.resetTime },
		};
		this.autoResetScheduler = new DailyScheduler(
			this.settings.resetTime,
			() => {
				this.resetTotalIntervals();
			},
		);

		this.enterInterval("focus", {
			minutes: this.settings.focusIntervalDuration,
			seconds: 0,
		});
	}

	public applySnapshot(snapshot: Snapshot): void {
		this.focusIntervals = {
			total: snapshot.focusIntervals.total,
			set: snapshot.focusIntervals.set,
		};
		this.enterInterval(snapshot.state, {
			minutes: snapshot.minutes,
			seconds: snapshot.seconds,
		});
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
		this.settings = { ...this.settings, ...settings };
	}

	public start(): void {
		const currentTimerType =
			this.currentInterval.timer.getCurrentTimerType();

		const result = this.currentInterval.timer.start();
		if (!result.ok) return;

		this.changeState("running");
		this.emit({
			type: "timer-started",
			mode: currentTimerType === "initialized" ? "fresh" : "resumed",
		});
	}

	public pause(): void {
		if (this.currentInterval.timer.pause().ok) {
			this.emit({ type: "timer-paused" });
		}
	}

	public reset(): void {
		const result = this.currentInterval.timer.reset();
		if (result.ok) {
			this.changeState("initialized");
			this.emit({ type: "timer-reset" });
		}
	}

	public resetIntervalsSet(): void {
		this.focusIntervals.set = 0;
		this.enterInterval("longBreak", {
			minutes: this.settings.longBreakDuration,
			seconds: 0,
		});
	}

	public resetTotalIntervals(): void {
		this.focusIntervals = { total: 0, set: 0 };
		this.enterInterval("focus", {
			minutes: this.settings.focusIntervalDuration,
			seconds: 0,
		});
	}

	public skipInterval(): void {
		this.currentInterval.timer.dispose();
		this.enterNextInterval({ reason: "skipped" });
	}

	public retime(minutes: number): RetimeResult {
		const parsed = parsePositiveInteger(minutes);
		if (!parsed.ok) {
			return err("invalid_minutes");
		}
		if (!isMinutes(parsed.value)) {
			return err("out_of_range_minutes");
		}
		if (this.currentInterval.timer.getCurrentTimerType() === "running") {
			return err("timer_running");
		}
		this.enterInterval(this.currentInterval.state, {
			minutes: parsed.value,
			seconds: this.currentInterval.timer.currentTime.seconds,
		});
		return ok();
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
		return match(this.currentInterval.timer.getCurrentTimerType())
			.with("initialized", "completed", () => "start" as const)
			.with("paused", () => "resume" as const)
			.with("running", () =>
				this.currentInterval.state === "focus" ? "reset" : "skip",
			)
			.exhaustive();
	}

	public dispose(): void {
		this.currentInterval.timer.dispose();
		this.disableAutoReset();
		this.eventListeners.clear();
	}

	public get state(): IntervalTimerState {
		return this.currentInterval.state;
	}

	public get status(): IntervalTimerStatus {
		return {
			timerState: this.currentInterval.timer.getCurrentTimerType(),
			snapshot: this.getSnapshot(),
		};
	}

	public get canStart(): boolean {
		return ["initialized", "paused"].includes(
			this.currentInterval.timer.getCurrentTimerType(),
		);
	}

	public get canPause(): boolean {
		return this.currentInterval.timer.getCurrentTimerType() === "running";
	}

	private enterNextInterval({
		reason,
	}: {
		reason: "completed" | "skipped";
	}): void {
		const previousState = this.currentInterval.state;
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
					this.enterInterval("longBreak", {
						minutes: this.settings.longBreakDuration,
						seconds: 0,
					});
				} else {
					this.enterInterval("shortBreak", {
						minutes: this.settings.shortBreakDuration,
						seconds: 0,
					});
				}
			})
			.with("shortBreak", "longBreak", () => {
				this.enterInterval("focus", {
					minutes: this.settings.focusIntervalDuration,
					seconds: 0,
				});
			})
			.exhaustive();

		if (reason === "skipped") {
			this.emit({
				type: "interval-skipped",
				from: previousState,
				to: this.currentInterval.state,
			});
			return;
		}
		const notificationMessage = match(this.currentInterval.state)
			.with("focus", () => "⏰  Now it's time to focus")
			.with("shortBreak", () => "☕️  Time for a short break")
			.with("longBreak", () => "🏖️  Time for a long break")
			.exhaustive();
		this.emit({
			type: "interval-completed",
			from: previousState,
			to: this.currentInterval.state,
			notificationMessage,
		});
	}

	private createTimer(minutes: Minutes, seconds: Seconds): CountdownTimer {
		return new CountdownTimer(
			{ minutes, seconds },
			() => {
				this.changeState("running");
			},
			() => {
				this.changeState("paused");
			},
			() => {
				this.enterNextInterval({ reason: "completed" });
			},
		);
	}

	private enterInterval(state: IntervalTimerState, time: Time): void {
		this.currentInterval.timer.dispose();
		this.currentInterval = {
			timer: this.createTimer(time.minutes, time.seconds),
			state,
		};
		this.changeState("initialized");
	}

	private changeState(timerState: TimerType): void {
		this.emit({ type: "state-changed", timerState });
	}

	private emit(event: IntervalTimerEventDetails): void {
		const timestampedEvent = {
			...event,
			occurredAt: new Date(),
			snapshot: this.getSnapshot(),
		};
		this.eventListeners.forEach((listener) => {
			listener(timestampedEvent);
		});
	}

	private getSnapshot(): Snapshot {
		return {
			...this.currentInterval.timer.currentTime,
			state: this.currentInterval.state,
			focusIntervals: { ...this.focusIntervals },
		};
	}
}
