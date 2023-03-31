import { Notice } from "obsidian";
import { CountdownTimer } from "../timer/countdownTimer";
import { Time } from "../time/time";
import { Setting } from "../setting/types";
import { IntervalTimerState, onChangeStateFunction } from "./types";
import { Seconds } from "../time/types";

export class IntervalTimerManager {
	private intervalTimerState: IntervalTimerState;

	private timer: CountdownTimer;

	private readonly onIntervalCreated: (intervalId: number) => void;

	private totalFocusIntervals: number;

	private setFocusIntervals: number;

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
		this.intervalTimerState = "focus";
		this.totalFocusIntervals = 0;
		this.setFocusIntervals = 0;

		this.timer = this.createTimer(this.settings.focusIntervalDuration, 0);
	}

	public startTimer = () => {
		this.timer.start();
		const intervalId = this.timer.getIntervalId();
		if (intervalId != null) {
			this.onIntervalCreated(intervalId);
		}
	};

	public pauseTimer = () => {
		this.timer.pause();
	};

	public resetTimer = () => {
		const result = this.timer.reset();
		if (result.type === "succeeded") {
			this.onChangeState(
				"initialized",
				this.intervalTimerState,
				result.resetTo,
				this.totalFocusIntervals
			);
		}
	};

	private onComplete = () => {
		new Notice("completed!");
		this.totalFocusIntervals += 1;
		this.onChangeState(
			"completed",
			this.intervalTimerState,
			new Time(0, 0),
			this.totalFocusIntervals
		);
	};

	private onPause = (current: Time) => {
		this.onChangeState(
			"paused",
			this.intervalTimerState,
			current,
			this.totalFocusIntervals
		);
	};

	private createTimer = (minutes: number, seconds: Seconds): CountdownTimer =>
		new CountdownTimer(
			new Time(minutes, seconds),
			(time: Time) =>
				this.onChangeState(
					"running",
					this.intervalTimerState,
					time,
					this.totalFocusIntervals
				),
			this.onPause,
			this.onComplete
		);
}
