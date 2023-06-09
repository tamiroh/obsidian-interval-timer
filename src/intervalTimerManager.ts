import { match } from "ts-pattern";
import { CountdownTimer, TimerType } from "./countdownTimer";
import { Seconds, Time } from "./types/time";
import { PluginSetting } from "./settingTab";

export type IntervalTimerState = "focus" | "shortBreak" | "longBreak";

export type onChangeStateFunction = (
	timerState: TimerType,
	intervalTimerState: IntervalTimerState,
	time: Time,
	focusIntervals: { total: number; set: number },
) => void;

export class IntervalTimerManager {
	private timerState: { timer: CountdownTimer; state: IntervalTimerState };

	private focusIntervals: { total: number; set: number };

	private readonly onIntervalCreated: (intervalId: number) => void;

	private readonly onChangeState: (type: TimerType, time: Time) => void;

	private readonly settings: PluginSetting;

	private readonly notifier: (message: string) => void;

	constructor(
		onChangeState: onChangeStateFunction,
		settings: PluginSetting,
		onIntervalCreated: (intervalId: number) => void,
		notifier: (message: string) => void,
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
		this.focusIntervals = { total: 0, set: 0 };
		this.timerState = {
			timer: this.createTimer(this.settings.focusIntervalDuration, 0),
			state: "focus",
		};
		this.notifier = notifier;

		this.onChangeState("initialized", {
			minutes: this.settings.focusIntervalDuration,
			seconds: 0,
		});
	}

	public startTimer = () => {
		this.timerState.timer.start();

		const intervalId = this.timerState.timer.getIntervalId();
		if (intervalId != null) {
			this.onIntervalCreated(intervalId);
		}
	};

	public pauseTimer = () => {
		this.timerState.timer.pause();
	};

	public resetTimer = () => {
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
