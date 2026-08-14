import { match } from "ts-pattern";
import { CountdownTimer, TimerType } from "./countdown-timer";
import { isMinutes, Minutes, Time } from "./time";
import { DailyScheduler } from "./daily-scheduler";
import { parsePositiveInteger } from "./value-parser";
import { err, ok, type Result } from "./result";

export type IntervalTimerSetting = {
	focusIntervalDuration: Minutes;
	shortBreakDuration: Minutes;
	longBreakDuration: Minutes;
	longBreakAfter: number;
	intervalCompletionBehavior?: IntervalCompletionBehavior;
	resetTime: { hours: number; minutes: number };
};

export type MutableIntervalTimerSetting = Omit<
	IntervalTimerSetting,
	"resetTime"
>;

export const defaultLongBreakAfter = 4;

export const intervalCompletionBehaviors = [
	"advanceToNextInterval",
	"countDownPastZero",
] as const;

export type IntervalCompletionBehavior =
	(typeof intervalCompletionBehaviors)[number];

export const intervalTimerStates = [
	"focus",
	"shortBreak",
	"longBreak",
] as const;

export type IntervalTimerState = (typeof intervalTimerStates)[number];

export type onChangeStateFunction = (
	timerState: TimerType,
	intervalTimerState: IntervalTimerState,
	time: Time,
	focusIntervals: { total: number; set: number },
) => void;

export type Snapshot = Time & {
	state: IntervalTimerState;
	nextState?: IntervalTimerState;
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

export type TouchAction = "start" | "resume" | "reset" | "skip" | "next";

export class IntervalTimer {
	private currentInterval: {
		timer: CountdownTimer;
		state: IntervalTimerState;
	};

	private focusIntervals: { total: number; set: number };

	private readonly eventListeners = new Set<
		(event: IntervalTimerEvent) => void
	>();

	private readonly onChangeState: (type: TimerType, time: Time) => void;

	private settings: IntervalTimerSetting;

	private readonly notifier: (
		message: string,
		context: NotifierContext,
	) => void;

	private readonly onStartedFreshly:
		((state: IntervalTimerState) => void) | undefined;

	private readonly onFocusIntervalEnded: (() => void) | undefined;

	private readonly autoResetScheduler: DailyScheduler;

	private pendingNextState: IntervalTimerState | null = null;

	constructor(
		onChangeState: onChangeStateFunction,
		settings: IntervalTimerSetting,
		notifier: (message: string, context: NotifierContext) => void,
		onStartedFreshly?: (state: IntervalTimerState) => void,
		onFocusIntervalEnded?: () => void,
	) {
		// Initialize properties

		this.settings = {
			...settings,
			resetTime: { ...settings.resetTime },
		};
		this.currentInterval = {
			timer: this.createTimer({ minutes: 0, seconds: 0 }), // dummy timer, will be replaced immediately
			state: "focus",
		};
		this.onChangeState = (timerState, time) => {
			onChangeState(
				timerState,
				this.currentInterval.state,
				time,
				this.focusIntervals,
			);
		};
		this.focusIntervals = {
			total: 0,
			set: 0,
		};
		this.notifier = notifier;
		this.onStartedFreshly = onStartedFreshly;
		this.onFocusIntervalEnded = onFocusIntervalEnded;
		this.autoResetScheduler = new DailyScheduler(
			this.settings.resetTime,
			() => {
				this.resetTotalIntervals();
			},
		);

		// Enter the initial interval

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
		this.enterInterval(
			snapshot.state,
			{
				minutes: snapshot.minutes,
				seconds: snapshot.seconds,
				...(snapshot.negative ? { negative: true as const } : {}),
			},
			snapshot.nextState,
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
		this.settings = { ...this.settings, ...settings };
		if (settings.intervalCompletionBehavior !== undefined) {
			this.currentInterval.timer.setContinuePastZero(
				settings.intervalCompletionBehavior === "countDownPastZero",
			);
		}
	}

	public start(): void {
		const currentTimerType =
			this.currentInterval.timer.getCurrentTimerType();

		const result = this.currentInterval.timer.start();
		if (!result.ok) return;

		this.changeState("running", this.currentInterval.timer.currentTime);
		if (currentTimerType === "initialized") {
			this.onStartedFreshly?.(this.currentInterval.state);
		}
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
			this.pendingNextState = null;
			this.changeState("initialized", result.value);
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
			.with("start", "resume", () => this.start())
			.with("reset", () => this.reset())
			.with("skip", "next", () => this.skipInterval())
			.exhaustive();
	}

	public predictTouch(): TouchAction {
		if (this.pendingNextState !== null) {
			return "next";
		}
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
		const nextState = match(previousState)
			.with("focus", () => {
				this.onFocusIntervalEnded?.();
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
			this.changeState("running", this.currentInterval.timer.currentTime);
		} else {
			this.enterInterval(nextState, this.getIntervalDuration(nextState));
		}

		if (reason === "skipped") {
			this.emit({
				type: "interval-skipped",
				from: previousState,
				to: this.currentInterval.state,
			});
			return;
		}
		const notificationMessage = match(nextState)
			.with("focus", () => "⏰  Now it's time to focus")
			.with("shortBreak", () => "☕️  Time for a short break")
			.with("longBreak", () => "🏖️  Time for a long break")
			.exhaustive();
		this.notifier(notificationMessage, {
			state: nextState,
		});
		this.emit({
			type: "interval-completed",
			from: previousState,
			to: nextState,
			notificationMessage,
		});
	}

	private createTimer(time: Time): CountdownTimer {
		const handlePause = (current: Time): void => {
			this.changeState("paused", current);
		};

		return new CountdownTimer(
			time,
			(time: Time) => this.changeState("running", time),
			handlePause,
			() => this.enterNextInterval({ reason: "completed" }),
			this.settings.intervalCompletionBehavior === "countDownPastZero",
		);
	}

	private enterInterval(
		state: IntervalTimerState,
		time: Time,
		pendingNextState?: IntervalTimerState,
	): void {
		this.currentInterval.timer.dispose();
		this.currentInterval = {
			timer: this.createTimer(time),
			state,
		};
		this.pendingNextState = pendingNextState ?? null;
		this.changeState("initialized", time);
	}

	private changeState(timerState: TimerType, time: Time): void {
		this.onChangeState(timerState, time);
		this.emit({ type: "state-changed", timerState });
	}

	private emit(event: IntervalTimerEventDetails): void {
		const timestampedEvent = {
			...event,
			occurredAt: new Date(),
			snapshot: this.getSnapshot(),
		};
		this.eventListeners.forEach((listener) => listener(timestampedEvent));
	}

	private getSnapshot(): Snapshot {
		return {
			...this.currentInterval.timer.currentTime,
			state: this.currentInterval.state,
			...(this.pendingNextState
				? { nextState: this.pendingNextState }
				: {}),
			focusIntervals: { ...this.focusIntervals },
		};
	}

	private getIntervalDuration(state: IntervalTimerState): Time {
		return {
			minutes: match(state)
				.with("focus", () => this.settings.focusIntervalDuration)
				.with("shortBreak", () => this.settings.shortBreakDuration)
				.with("longBreak", () => this.settings.longBreakDuration)
				.exhaustive(),
			seconds: 0,
		};
	}
}
