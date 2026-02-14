import { match } from "ts-pattern";
import { CountdownTimer, TimerType } from "./countdown-timer";
import { Minutes, Seconds, Time } from "./time";
import { NotificationStyle } from "./notifier";
import { DailyScheduler } from "./daily-scheduler";

export type IntervalTimerSetting = {
	focusIntervalDuration: number;
	shortBreakDuration: number;
	longBreakDuration: number;
	longBreakAfter: number;
	notificationStyle: NotificationStyle;
	resetTime: { hours: number; minutes: number };
};

export type IntervalTimerState = "focus" | "shortBreak" | "longBreak";

export type onChangeStateFunction = (
	timerState: TimerType,
	intervalTimerState: IntervalTimerState,
	time: Time,
	focusIntervals: { total: number; set: number },
) => void;

export type InitialParams = {
	minutes?: Minutes;
	seconds?: Seconds;
	state?: IntervalTimerState;
	focusIntervals?: { total?: number; set?: number };
};

export type NotifierContext = {
	state: IntervalTimerState;
};

export class IntervalTimer {
	private currentInterval: {
		timer: CountdownTimer;
		state: IntervalTimerState;
	};

	private focusIntervals: { total: number; set: number };

	private readonly onChangeState: (type: TimerType, time: Time) => void;

	private readonly settings: IntervalTimerSetting;

	private readonly notifier: (
		message: string,
		context: NotifierContext,
	) => void;

	private readonly autoResetScheduler: DailyScheduler;

	constructor(
		onChangeState: onChangeStateFunction,
		settings: IntervalTimerSetting,
		notifier: (message: string, context: NotifierContext) => void,
		initialParams?: InitialParams,
	) {
		this.onChangeState = (timerState, time) => {
			onChangeState(
				timerState,
				this.currentInterval.state,
				time,
				this.focusIntervals,
			);
		};
		this.settings = settings;
		this.focusIntervals = {
			total: initialParams?.focusIntervals?.total ?? 0,
			set: initialParams?.focusIntervals?.set ?? 0,
		};
		this.currentInterval = {
			timer: this.createTimer(
				initialParams?.minutes ?? this.settings.focusIntervalDuration,
				initialParams?.seconds ?? 0,
			),
			state: initialParams?.state ?? "focus",
		};
		this.notifier = notifier;
		this.autoResetScheduler = new DailyScheduler(settings.resetTime, () => {
			this.resetTotalIntervals();
		});

		this.onChangeState("initialized", {
			minutes:
				initialParams?.minutes ?? this.settings.focusIntervalDuration,
			seconds: initialParams?.seconds ?? 0,
		});
	}

	public enableAutoReset(): void {
		this.autoResetScheduler.enable();
	}

	public disableAutoReset(): void {
		this.autoResetScheduler.disable();
	}

	public start(): void {
		this.currentInterval.timer.start();
	}

	public pause(): void {
		this.currentInterval.timer.pause();
	}

	public reset(): void {
		const result = this.currentInterval.timer.reset();
		if (result.type === "succeeded") {
			this.onChangeState("initialized", result.resetTo);
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

	public retime(minutes: number): boolean {
		if (this.currentInterval.timer.getCurrentTimerType() === "running") {
			return false;
		}
		this.enterInterval(this.currentInterval.state, {
			minutes,
			seconds: 0,
		});
		return true;
	}

	public touch(): void {
		match(this.currentInterval.timer.getCurrentTimerType())
			.with("initialized", "paused", "completed", () => {
				this.start();
			})
			.with("running", () => {
				match(this.currentInterval.state)
					.with("focus", () => {
						this.reset();
					})
					.with("shortBreak", "longBreak", () => {
						this.skipInterval();
					})
					.exhaustive();
			})
			.exhaustive();
	}

	public dispose(): void {
		this.currentInterval.timer.dispose();
		this.disableAutoReset();
	}

	private enterNextInterval({
		shouldNotify = true,
	}: { shouldNotify?: boolean } = {}): void {
		match(this.currentInterval.state)
			.with("focus", () => {
				this.focusIntervals = {
					total: this.focusIntervals.total + 1,
					set: this.focusIntervals.set + 1,
				};
				if (this.focusIntervals.set === this.settings.longBreakAfter) {
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
