import { Notice } from "obsidian";
import { match } from "ts-pattern";
import { CountdownTimer } from "../timer/countdownTimer";
import { Time } from "../time/time";
import { Setting } from "../setting/types";
import { IntervalTimerState, onChangeStateFunction } from "./types";
import { Seconds } from "../time/types";
import { TimerType } from "../timer/types";

export class IntervalTimerManager {
	private timerState: { timer: CountdownTimer; state: IntervalTimerState };

	private focusIntervals: { total: number; set: number };

	private readonly onIntervalCreated: (intervalId: number) => void;

	private readonly onChangeState: (type: TimerType, time: Time) => void;

	private readonly settings: Setting;

	constructor(
		onChangeState: onChangeStateFunction,
		settings: Setting,
		onIntervalCreated: (intervalId: number) => void
	) {
		this.onChangeState = (timerState, time) => {
			onChangeState(
				timerState,
				this.timerState.state,
				time,
				this.focusIntervals
			);
		};
		this.settings = settings;
		this.onIntervalCreated = onIntervalCreated;
		this.focusIntervals = { total: 0, set: 0 };
		this.timerState = {
			timer: this.createTimer(this.settings.focusIntervalDuration, 0),
			state: "focus",
		};
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

	private onComplete = () => {
		new Notice("completed!");
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
							0
						),
						state: "longBreak",
					};
					this.onChangeState(
						"initialized",
						new Time(this.settings.longBreakDuration, 0)
					);
				} else {
					this.timerState = {
						timer: this.createTimer(
							this.settings.shortBreakDuration,
							0
						),
						state: "shortBreak",
					};
					this.onChangeState(
						"initialized",
						new Time(this.settings.shortBreakDuration, 0)
					);
				}
			})
			.with("shortBreak", "longBreak", () => {
				this.timerState = {
					timer: this.createTimer(
						this.settings.focusIntervalDuration,
						0
					),
					state: "focus",
				};
				this.onChangeState(
					"initialized",
					new Time(this.settings.focusIntervalDuration, 0)
				);
			})
			.exhaustive();
	};

	private onPause = (current: Time) => {
		this.onChangeState("paused", current);
	};

	private createTimer = (minutes: number, seconds: Seconds): CountdownTimer =>
		new CountdownTimer(
			new Time(minutes, seconds),
			(time: Time) => this.onChangeState("running", time),
			this.onPause,
			this.onComplete
		);
}
