import { Notice } from "obsidian";
import { CountdownTimer } from "../timer/countdownTimer";
import { Time } from "../time/time";
import { Setting } from "../setting/types";
import { TimerType } from "../timer/types";
import { IntervalTimerState } from "./types";

export class IntervalTimerManager {
	private intervalTimerState: IntervalTimerState;

	private timer: CountdownTimer;

	private readonly onIntervalCreated: (intervalId: number) => void;

	private totalFocusIntervals: number;

	private setFocusIntervals: number;

	private readonly onChangeState: (
		timerState: TimerType,
		intervalTimerState: IntervalTimerState,
		time: Time
	) => void;

	private readonly settings: Setting;

	constructor(
		onChangeState: (
			timerState: TimerType,
			intervalTimerState: IntervalTimerState,
			time: Time
		) => void,
		settings: Setting,
		onIntervalCreated: (intervalId: number) => void
	) {
		this.onChangeState = onChangeState;
		this.settings = settings;
		this.onIntervalCreated = onIntervalCreated;
		this.timer = new CountdownTimer(
			new Time(settings.focusIntervalDuration, 0),
			(time: Time) =>
				onChangeState("running", this.intervalTimerState, time),
			this.onPause,
			this.onComplete
		);
		this.intervalTimerState = "focus";
		this.totalFocusIntervals = 0;
		this.setFocusIntervals = 0;
	}

	public startTimer = () => {
		if (this.timer == null) {
			const startTime = new Time(this.settings.focusIntervalDuration, 0);
			const timer = new CountdownTimer(
				startTime,
				(time: Time) =>
					this.onChangeState(
						"running",
						this.intervalTimerState,
						time
					),
				this.onPause,
				this.onComplete
			);
			this.intervalTimerState = "focus";
			this.timer = timer;
		}
		this.onChangeState(
			"running",
			this.intervalTimerState,
			new Time(this.settings.focusIntervalDuration, 0)
		);
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
				result.resetTo
			);
		}
	};

	private onComplete = () => {
		new Notice("completed!");
		this.onChangeState(
			"completed",
			this.intervalTimerState,
			new Time(0, 0)
		);
	};

	private onPause = (current: Time) => {
		this.onChangeState("paused", this.intervalTimerState, current);
	};
}
