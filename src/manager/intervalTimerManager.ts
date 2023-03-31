import { Notice } from "obsidian";
import { CountdownTimer } from "../timer/countdownTimer";
import { Time } from "../time/time";
import { Setting } from "../setting/types";
import { IntervalTimerState, onChangeStateFunction } from "./types";
import { Seconds } from "../time/types";

export class IntervalTimerManager {
	private timerState: { timer: CountdownTimer; state: IntervalTimerState };

	private focusIntervals: { total: number; set: number };

	private readonly onIntervalCreated: (intervalId: number) => void;

	private readonly onChangeState: onChangeStateFunction;

	private readonly settings: Setting;

	constructor(
		onChangeState: onChangeStateFunction,
		settings: Setting,
		onIntervalCreated: (intervalId: number) => void
	) {
		this.onChangeState = onChangeState;
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
			this.onChangeState(
				"initialized",
				this.timerState.state,
				result.resetTo,
				this.focusIntervals
			);
		}
	};

	private onComplete = () => {
		new Notice("completed!");
		this.focusIntervals = {
			total: this.focusIntervals.total + 1,
			set: this.focusIntervals.set + 1,
		};
		this.onChangeState(
			"completed",
			this.timerState.state,
			new Time(0, 0),
			this.focusIntervals
		);
	};

	private onPause = (current: Time) => {
		this.onChangeState(
			"paused",
			this.timerState.state,
			current,
			this.focusIntervals
		);
	};

	private createTimer = (minutes: number, seconds: Seconds): CountdownTimer =>
		new CountdownTimer(
			new Time(minutes, seconds),
			(time: Time) =>
				this.onChangeState(
					"running",
					this.timerState.state,
					time,
					this.focusIntervals
				),
			this.onPause,
			this.onComplete
		);
}
