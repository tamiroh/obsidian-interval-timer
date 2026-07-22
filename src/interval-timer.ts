import { match } from "ts-pattern";
import { CountdownTimer, TimerType } from "./countdown-timer";
import { Minutes, Seconds, Time } from "./time";
import { DailyScheduler } from "./daily-scheduler";
import { parsePositiveInteger } from "./value-parser";
import type { Result } from "./result";

export type IntervalTimerSetting = {
	focusIntervalDuration: number;
	shortBreakDuration: number;
	longBreakDuration: number;
	longBreakAfter: number;
	resetTime: { hours: number; minutes: number };
};

export type MutableIntervalTimerSetting = Omit<
	IntervalTimerSetting,
	"resetTime"
>;

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

export type Snapshot = {
	minutes: Minutes;
	seconds: Seconds;
	state: IntervalTimerState;
	focusIntervals: { total: number; set: number };
};

export type NotifierContext = {
	state: IntervalTimerState;
};

export type RetimeResult = Result<void, "invalid_minutes" | "timer_running">;

export type TouchAction = "start" | "resume" | "reset" | "skip";

export class IntervalTimer {
	private currentInterval: {
		timer: CountdownTimer;
		state: IntervalTimerState;
	};

	private focusIntervals: { total: number; set: number };

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

	constructor(
		onChangeState: onChangeStateFunction,
		settings: IntervalTimerSetting,
		notifier: (message: string, context: NotifierContext) => void,
		onStartedFreshly?: (state: IntervalTimerState) => void,
		onFocusIntervalEnded?: () => void,
	) {
		// Initialize properties

		this.currentInterval = {
			timer: this.createTimer(0, 0), // dummy timer, will be replaced immediately
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
		this.settings = {
			...settings,
			resetTime: { ...settings.resetTime },
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
		this.enterInterval(snapshot.state, {
			minutes: snapshot.minutes,
			seconds: snapshot.seconds,
		});
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

		this.onChangeState("running", this.currentInterval.timer.currentTime);
		if (currentTimerType === "initialized") {
			this.onStartedFreshly?.(this.currentInterval.state);
		}
	}

	public pause(): void {
		this.currentInterval.timer.pause();
	}

	public reset(): void {
		const result = this.currentInterval.timer.reset();
		if (result.ok) {
			this.onChangeState("initialized", result.value);
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
		this.currentInterval.timer.pause();
		this.enterNextInterval({ shouldNotify: false });
	}

	public retime(minutes: number): RetimeResult {
		const parsed = parsePositiveInteger(minutes);
		if (!parsed.ok) {
			return { ok: false, reason: "invalid_minutes" };
		}
		if (this.currentInterval.timer.getCurrentTimerType() === "running") {
			return { ok: false, reason: "timer_running" };
		}
		this.enterInterval(this.currentInterval.state, {
			minutes: parsed.value,
			seconds: this.currentInterval.timer.currentTime.seconds,
		});
		return { ok: true, value: undefined };
	}

	public touch(): void {
		const action = this.predictTouch();
		match(action)
			.with("start", "resume", () => this.start())
			.with("reset", () => this.reset())
			.with("skip", () => this.skipInterval())
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
	}

	public get state(): IntervalTimerState {
		return this.currentInterval.state;
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
		shouldNotify = true,
	}: { shouldNotify?: boolean } = {}): void {
		match(this.currentInterval.state)
			.with("focus", () => {
				this.onFocusIntervalEnded?.();
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

		if (shouldNotify) {
			this.notifier(
				match(this.currentInterval.state)
					.with("focus", () => "⏰  Now it's time to focus")
					.with("shortBreak", () => "☕️  Time for a short break")
					.with("longBreak", () => "🏖️  Time for a long break")
					.exhaustive(),
				{ state: this.currentInterval.state },
			);
		}
	}

	private createTimer(minutes: number, seconds: Seconds): CountdownTimer {
		const handlePause = (current: Time): void => {
			this.onChangeState("paused", current);
		};

		return new CountdownTimer(
			{ minutes, seconds },
			(time: Time) => this.onChangeState("running", time),
			handlePause,
			this.enterNextInterval.bind(this),
		);
	}

	private enterInterval(state: IntervalTimerState, time: Time): void {
		this.currentInterval.timer.dispose();
		this.currentInterval = {
			timer: this.createTimer(time.minutes, time.seconds),
			state,
		};
		this.onChangeState("initialized", time);
	}
}
