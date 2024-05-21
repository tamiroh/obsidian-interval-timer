import { match } from "ts-pattern";
import { CountdownTimer, TimerState } from "./countdownTimer";
import { Minutes, Seconds, Time } from "./time";
import { NotificationStyle } from "./notifier";

export type IntervalTimerSetting = {
	focusIntervalDuration: number;
	shortBreakDuration: number;
	longBreakDuration: number;
	longBreakAfter: number;
	notificationStyle: NotificationStyle;
};

export type IntervalTimerState = "focus" | "shortBreak" | "longBreak";

export type onChangeStateFunction = (
	timerState: TimerState,
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

export class IntervalTimer {
	private timerState: { timer: CountdownTimer; state: IntervalTimerState };

	private focusIntervals: { total: number; set: number };

	private readonly onIntervalCreated: (intervalId: number) => void;

	private readonly onChangeState: (type: TimerState, time: Time) => void;

	private readonly settings: IntervalTimerSetting;

	private readonly notifier: (message: string) => void;

	constructor(
		onChangeState: onChangeStateFunction,
		settings: IntervalTimerSetting,
		onIntervalCreated: (intervalId: number) => void,
		notifier: (message: string) => void,
		initialParams?: InitialParams,
	) {
		this.onChangeState = (timerState, time) => {
			onChangeState(
				timerState,
				this.timerState.state,
				time,
				this.focusIntervals,
			);
		};
		this.settings = settings;
		this.onIntervalCreated = onIntervalCreated;
		this.focusIntervals = {
			total: initialParams?.focusIntervals?.total ?? 0,
			set: initialParams?.focusIntervals?.set ?? 0,
		};
		this.timerState = {
			timer: this.createTimer(
				initialParams?.minutes ?? this.settings.focusIntervalDuration,
				initialParams?.seconds ?? 0,
			),
			state: initialParams?.state ?? "focus",
		};
		this.notifier = notifier;

		this.onChangeState("initialized", {
			minutes:
				initialParams?.minutes ?? this.settings.focusIntervalDuration,
			seconds: initialParams?.seconds ?? 0,
		});
	}

	public start = () => {
		this.timerState.timer.start();

		const intervalId = this.timerState.timer.getIntervalId();
		if (intervalId != null) {
			this.onIntervalCreated(intervalId);
		}
	};

	public pause = () => {
		this.timerState.timer.pause();
	};

	public reset = () => {
		const result = this.timerState.timer.reset();
		if (result.type === "succeeded") {
			this.onChangeState("initialized", result.resetTo);
		}
	};

	public resetIntervalsSet = () => {
		this.timerState.timer.pause();
		this.focusIntervals.set = 0;
		this.timerState = {
			timer: this.createTimer(this.settings.longBreakDuration, 0),
			state: "longBreak",
		};
		this.onChangeState("initialized", {
			minutes: this.settings.longBreakDuration,
			seconds: 0,
		});
	};

	public resetTotalIntervals = () => {
		this.timerState.timer.pause();
		this.focusIntervals = { total: 0, set: 0 };
		this.timerState = {
			timer: this.createTimer(this.settings.focusIntervalDuration, 0),
			state: "focus",
		};
		this.onChangeState("initialized", {
			minutes: this.settings.focusIntervalDuration,
			seconds: 0,
		});
	};

	public next = () => {
		match(this.timerState.timer.getCurrentState())
			.with('initialized', () => this.start())
			.with('running', () => {
				if (this.timerState.state === 'focus') {
					this.pause();
				} else {
					this.skipInterval();
				}
			})
			.with('paused', () => this.start())
			.with('completed', () => this.start())
			.exhaustive();
	};

	public skipInterval = () => {
		this.timerState.timer.pause();
		this.onComplete();
	};

	private onComplete = () => {
		match(this.timerState.state)
			.with("focus", () => {
				this.focusIntervals = {
					total: this.focusIntervals.total + 1,
					set: this.focusIntervals.set + 1,
				};
				if (this.focusIntervals.set === this.settings.longBreakAfter) {
					this.focusIntervals.set = 0;
					this.timerState = {
						timer: this.createTimer(
							this.settings.longBreakDuration,
							0,
						),
						state: "longBreak",
					};
					this.onChangeState("initialized", {
						minutes: this.settings.longBreakDuration,
						seconds: 0,
					});
				} else {
					this.timerState = {
						timer: this.createTimer(
							this.settings.shortBreakDuration,
							0,
						),
						state: "shortBreak",
					};
					this.onChangeState("initialized", {
						minutes: this.settings.shortBreakDuration,
						seconds: 0,
					});
				}
			})
			.with("shortBreak", "longBreak", () => {
				this.timerState = {
					timer: this.createTimer(
						this.settings.focusIntervalDuration,
						0,
					),
					state: "focus",
				};
				this.onChangeState("initialized", {
					minutes: this.settings.focusIntervalDuration,
					seconds: 0,
				});
			})
			.exhaustive();

		this.notifier(
			match(this.timerState.state)
				.with("focus", () => "⏰  Now it's time to focus")
				.with("shortBreak", () => "☕️  Time for a short break")
				.with("longBreak", () => "🏖️  Time for a long break")
				.exhaustive(),
		);
	};

	private onPause = (current: Time) => {
		this.onChangeState("paused", current);
	};

	private createTimer = (minutes: number, seconds: Seconds): CountdownTimer =>
		new CountdownTimer(
			{ minutes, seconds },
			(time: Time) => this.onChangeState("running", time),
			this.onPause,
			this.onComplete,
		);
}
